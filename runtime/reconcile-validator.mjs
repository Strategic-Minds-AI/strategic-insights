export function validateHeartbeat(receipt) {
  const failures = [];
  const warnings = [];

  if (!receipt.run_id) failures.push('MISSING_RUN_ID');
  if (!receipt.started_at || !receipt.finished_at) failures.push('MISSING_TIMESTAMPS');
  if (!receipt.source_sha) warnings.push('MISSING_SOURCE_SHA');

  const downstream = receipt.downstream || {};
  if (downstream.validator_missing) failures.push('DOWNSTREAM_VALIDATOR_MISSING');
  if (downstream.status === 'FAIL') failures.push('DOWNSTREAM_FAIL');
  if (downstream.status === 'UNKNOWN') failures.push('DOWNSTREAM_UNKNOWN');
  if ((receipt.protected_actions_executed || []).length) {
    failures.push('PROTECTED_ACTION_EXECUTED_BY_HEARTBEAT');
  }

  const status = failures.length
    ? 'FAIL'
    : downstream.status === 'BLOCKED'
      ? 'BLOCKED'
      : 'PASS';

  return {
    status,
    release_eligible: status === 'PASS',
    failures,
    warnings,
    validated_at: new Date().toISOString(),
    validator: 'runtime/reconcile-validator.mjs'
  };
}
