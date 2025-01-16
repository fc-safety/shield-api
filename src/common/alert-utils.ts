import { $Enums } from '@prisma/client';
import { JsonValue } from '@prisma/client/runtime/library';
import {
  differenceInDays,
  format,
  isAfter,
  isBefore,
  isSameDay,
  parseISO,
} from 'date-fns';
import {
  CreateAssetAlertCriterionRuleSchema,
  RuleClauseSchema,
} from 'src/products/asset-questions/dto/create-asset-question.dto';
import { z } from 'zod';

const compare = (
  value: JsonValue,
  valueType: $Enums.AssetQuestionResponseType,
  clause: string | number,
  ops: {
    string?: (test: string, value: string) => string | false;
    stringOrNumber?: (
      test: string | number,
      value: string | number,
    ) => string | false;
    number?: (test: number, value: number) => string | false;
    date?: (test: Date, value: Date) => string | false;
  },
) => {
  if (valueType === 'DATE') {
    return (
      ops.date?.(parseISO(String(clause)), parseISO(String(value))) ?? false
    );
  }
  if (valueType === 'NUMBER') {
    return (
      ops.number?.(Number(clause), Number(value)) ??
      ops.stringOrNumber?.(Number(clause), Number(value)) ??
      false
    );
  } else {
    return (
      ops.string?.(String(clause).toLowerCase(), String(value).toLowerCase()) ??
      ops.stringOrNumber?.(
        String(clause).toLowerCase(),
        String(value).toLowerCase(),
      ) ??
      false
    );
  }
};

const explain = (result: boolean, message: string) =>
  result ? message : false;

const testAlertRuleClause = (
  value: JsonValue,
  valueType: $Enums.AssetQuestionResponseType,
  clause: z.infer<typeof RuleClauseSchema>,
) => {
  if (typeof clause === 'string') {
    return compare(value, valueType, clause, {
      stringOrNumber: (t, v) => explain(t === v, `value is ${t}`),
      date: (t, v) => explain(isSameDay(t, v), `value is ${t}`),
    });
  }
  if (clause.contains !== undefined) {
    return compare(value, valueType, clause.contains, {
      string: (t, v) => explain(v.includes(t), `value contains ${t}`),
    });
  }
  if (clause.empty !== undefined) {
    return explain(
      value === null || value === undefined || value === '',
      'value is empty',
    );
  }
  if (clause.endsWith !== undefined) {
    return compare(value, valueType, clause.endsWith, {
      string: (t, v) => explain(v.endsWith(t), `value ends with ${t}`),
    });
  }
  if (clause.equals !== undefined) {
    return compare(value, valueType, clause.equals, {
      stringOrNumber: (t, v) => explain(t === v, `value is ${t}`),
      date: (t, v) =>
        explain(isSameDay(t, v), `value is on ${format(t, 'PP')}`),
    });
  }
  if (clause.gt !== undefined) {
    return compare(value, valueType, clause.gt, {
      stringOrNumber: (t, v) => explain(t > v, `value is more than ${t}`),
      date: (t, v) =>
        explain(isAfter(v, t), `value is after ${format(t, 'PP')}`),
    });
  }
  if (clause.gte !== undefined) {
    return compare(value, valueType, clause.gte, {
      stringOrNumber: (t, v) =>
        explain(t >= v, `value is more than or equal to ${t}`),
      date: (t, v) =>
        explain(
          isSameDay(t, v) || isAfter(v, t),
          `value is on or after ${format(t, 'PP')}`,
        ),
    });
  }
  if (clause.lt !== undefined) {
    return compare(value, valueType, clause.lt, {
      stringOrNumber: (t, v) => explain(t < v, `value is less than ${t}`),
      date: (t, v) =>
        explain(isBefore(v, t), `value is before ${format(t, 'PP')}`),
    });
  }
  if (clause.lte !== undefined) {
    return compare(value, valueType, clause.lte, {
      stringOrNumber: (t, v) =>
        explain(t <= v, `value is less than or equal to ${t}`),
      date: (t, v) =>
        explain(
          isSameDay(t, v) || isBefore(v, t),
          `value is on or before ${format(t, 'PP')}`,
        ),
    });
  }
  if (clause.not !== undefined) {
    return compare(value, valueType, clause.not, {
      stringOrNumber: (t, v) => explain(t !== v, `value is not ${t}`),
      date: (t, v) =>
        explain(!isSameDay(t, v), `value is not on ${format(t, 'PP')}`),
    });
  }
  if (clause.notContains !== undefined) {
    return compare(value, valueType, clause.notContains, {
      string: (t, v) => explain(!v.includes(t), `value doees not contain ${t}`),
    });
  }
  if (clause.notEmpty !== undefined) {
    return explain(
      value !== null && value !== undefined && value !== '',
      `value is not empty`,
    );
  }
  if (clause.startsWith !== undefined) {
    return compare(value, valueType, clause.startsWith, {
      string: (t, v) => explain(v.startsWith(t), `value starts with ${t}`),
    });
  }
  if (clause.beforeDaysPast !== undefined) {
    return explain(
      differenceInDays(Date.now(), parseISO(String(value))) >
        clause.beforeDaysPast,
      `value is more than ${clause.beforeDaysPast} days in the past`,
    );
  }
  if (clause.afterDaysPast !== undefined) {
    return explain(
      differenceInDays(Date.now(), parseISO(String(value))) <
        clause.afterDaysPast,
      `value is less than ${clause.afterDaysPast} days in the past`,
    );
  }
  if (clause.beforeDaysFuture !== undefined) {
    return explain(
      differenceInDays(parseISO(String(value)), Date.now()) <
        clause.beforeDaysFuture,
      `value is less than ${clause.beforeDaysFuture} days in the future`,
    );
  }
  if (clause.afterDaysFuture !== undefined) {
    return explain(
      differenceInDays(parseISO(String(value)), Date.now()) >
        clause.afterDaysFuture,
      `value is more than ${clause.afterDaysFuture} days in the future`,
    );
  }
  return false;
};

export const testAlertRule = (
  value: JsonValue,
  valueType: $Enums.AssetQuestionResponseType,
  rule: z.infer<typeof CreateAssetAlertCriterionRuleSchema>,
): string | false => {
  if (rule.value) {
    return testAlertRuleClause(value, valueType, rule.value);
  } else if (rule.AND) {
    const results = rule.AND.map((subrule) =>
      testAlertRule(value, valueType, subrule),
    );
    return results.every(Boolean) ? results.join(', ') : false;
  } else if (rule.OR) {
    return (
      rule.OR.map((subrule) => testAlertRule(value, valueType, subrule)).find(
        Boolean,
      ) ?? false
    );
  }
  return false;
};
