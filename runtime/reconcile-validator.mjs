export function validateHeartbeat(receipt) {
  const failures = [];
  if (!receipt.run_id) failures.push('MISSING_RUN_ID');
  if (!receipt.started_at || !receipt.finished_at) failures.push('MISSING_TIMESTAMPS');
  if ((receipt.protected_actions_executed || []).length) {
    failures.push('PROTECTED_ACTION_EXECUTED');
  }
  if (receipt.downstream?.status === 'FAIL' || receipt.downstream?.status === 'UNKNOWN') {
    failures.push('DOWNSTREAM_NOT_VALID');
  }
  if (receipt.downstream?.validator_missing) {
    failures.push('DOWNSTREAM_VALIDATOR_MISSING');
  }

  const status = failures.length
    ? 'FAIL'
    : receipt.downstream?.status === 'BLOCKED'
      ? 'BLOCKED'
      : 'PASS';

  return {
    status,
    release_eligible: status === 'PASS',
    failures,
    validated_at: new Date().toISOString(),
    validator: 'runtime/reconcile-validator.mjs'
  };
}
