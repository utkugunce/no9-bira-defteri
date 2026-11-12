// Calendar arithmetic in UTC keeps date-only plans stable across DST changes.
export function addDays(value, days) {
 const date = new Date(value + 'T12:00:00Z');
 date.setUTCDate(date.getUTCDate() + Number(days));
 return date.toISOString().slice(0, 10);
}

export function brewPlan(batch, bottled = batch.bottled) {
 const bottleTarget = addDays(batch.started, batch.fermentDays);
 return {
  bottleTarget,
  firstSip: addDays(bottled || bottleTarget, batch.conditionDays),
  estimated: !bottled
 };
}
