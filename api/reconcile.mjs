import { validateHeartbeat } from '../runtime/reconcile-validator.mjs';

export default async function handler(req, res) {
  const startedAt = new Date().toISOString();
  const runId = 'strategic-insights-' + Math.floor(Date.now() / (5 * 60 * 1000));
  const environment = process.env.VERCEL_ENV || 'development';

  const cronSecret = process.env.CRON_SECRET || '';
  if (environment === 'production') {
    if (!cronSecret) {
      return res.status(503).json({ ok:false, status:'BLOCKED', reason:'CRON_SECRET_NOT_CONFIGURED' });
    }
    if (req.headers.authorization !== 'Bearer ' + cronSecret) {
      return res.status(401).json({ ok:false, status:'BLOCKED', reason:'UNAUTHORIZED_HEARTBEAT' });
    }
  }

  const target = process.env.STRATEGIC_INSIGHTS_RECONCILE_URL || '';
  const runtimeToken = process.env.STRATEGIC_INSIGHTS_RUNTIME_TOKEN || '';

  let downstream;
  if (!target || !runtimeToken) {
    downstream = {
      status:'BLOCKED',
      reason:'BASE44_RUNTIME_BINDING_NOT_CONFIGURED',
      validator_missing:false
    };
  } else {
    try {
      const response = await fetch(target, {
        method:'POST',
        headers:{
          'content-type':'application/json',
          'authorization':'Bearer ' + runtimeToken
        },
        body:JSON.stringify({ run_id:runId, max_domains:5 })
      });

      const data = await response.json().catch(() => ({}));
      const results = Array.isArray(data.results) ? data.results : [];
      const statuses = results.map(x => x.status).filter(Boolean);

      downstream = {
        http_status:response.status,
        status:!response.ok
          ? (data.status || 'FAIL')
          : statuses.includes('FAIL')
            ? 'FAIL'
            : statuses.includes('UNKNOWN')
              ? 'UNKNOWN'
              : statuses.includes('BLOCKED')
                ? 'BLOCKED'
                : 'PASS',
        validator_missing:results.some(x => !x.status || !x.receipt_id),
        summary:{
          processed_count:data.processed_count || 0,
          pass:data.pass || 0,
          fail:data.fail || 0,
          blocked:data.blocked || 0,
          unknown:data.unknown || 0
        }
      };
    } catch (error) {
      downstream = { status:'UNKNOWN', error:error.message, validator_missing:true };
    }
  }

  const receipt = {
    run_id:runId,
    started_at:startedAt,
    finished_at:new Date().toISOString(),
    environment,
    source_sha:process.env.VERCEL_GIT_COMMIT_SHA || null,
    downstream,
    protected_actions_executed:[]
  };
  const validator = validateHeartbeat(receipt);
  console.log(JSON.stringify({ type:'STRATEGIC_INSIGHTS_HEARTBEAT_RECEIPT', ...receipt, validator }));

  const httpStatus = validator.status === 'PASS' ? 200 : validator.status === 'BLOCKED' ? 503 : 503;
  return res.status(httpStatus).json({ ...receipt, validator });
}
