import { validateHeartbeat } from '../runtime/reconcile-validator.mjs';

export default async function handler(req, res) {
  const startedAt = new Date().toISOString();
  const environment = process.env.VERCEL_ENV || 'development';
  const runId = 'strategic-insights-' + Date.now();
  const schedule = String(req.headers['x-vercel-cron-schedule'] || '');

  if (environment === 'production' && schedule && schedule !== '*/5 * * * *') {
    return res.status(409).json({
      ok:false,
      status:'BLOCKED',
      reason:'CRON_SCHEDULE_MISMATCH'
    });
  }

  const target = process.env.STRATEGIC_INSIGHTS_RECONCILE_URL || '';
  const runtimeToken = process.env.STRATEGIC_INSIGHTS_RUNTIME_TOKEN || '';

  let downstream;
  if (!target || !runtimeToken) {
    downstream = {
      status:'BLOCKED',
      reason:'RUNTIME_BINDING_NOT_CONFIGURED',
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
        body:JSON.stringify({ run_id:runId, max_actions:5 })
      });

      const data = await response.json().catch(() => ({}));
      const statuses = (data.results || [])
        .map(item => item.validation?.status)
        .filter(Boolean);

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
        validator_missing:(data.results || []).some(item => !item.validation?.status),
        summary:{
          processed_count:data.processed_count || 0,
          protected_blocked_count:data.protected_blocked_count || 0,
          pass:data.pass || 0,
          fail:data.fail || 0,
          blocked:data.blocked || 0,
          unknown:data.unknown || 0
        }
      };
    } catch (error) {
      downstream = {
        status:'UNKNOWN',
        error:error.message,
        validator_missing:true
      };
    }
  }

  const receipt = {
    run_id:runId,
    started_at:startedAt,
    finished_at:new Date().toISOString(),
    environment,
    source_sha:process.env.VERCEL_GIT_COMMIT_SHA || null,
    schedule,
    downstream,
    protected_actions_executed:[]
  };

  const validator = validateHeartbeat(receipt);
  const result = { ...receipt, validator };

  console.log(JSON.stringify({
    type:'STRATEGIC_INSIGHTS_RECONCILE_RECEIPT',
    ...result
  }));

  return res.status(validator.status === 'FAIL' ? 503 : 200).json(result);
}
