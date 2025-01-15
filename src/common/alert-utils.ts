import { $Enums } from '@prisma/client';
import { JsonValue } from '@prisma/client/runtime/library';
import { isAfter, isBefore, isSameDay, parseISO } from 'date-fns';
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
      stringOrNumber: (t, v) => explain(t === v, `${t} is ${v}`),
      date: (t, v) => explain(isSameDay(t, v), `${t} is ${v}`),
    });
  }
  if (clause.contains !== undefined) {
    return compare(value, valueType, clause.contains, {
      string: (t, v) => explain(v.includes(t), `${t} contains ${v}`),
    });
  }
  if (clause.empty !== undefined) {
    return explain(
      value === null || value === undefined || value === '',
      `${value} is empty`,
    );
  }
  if (clause.endsWith !== undefined) {
    return compare(value, valueType, clause.endsWith, {
      string: (t, v) => explain(v.endsWith(t), `${t} ends with ${v}`),
    });
  }
  if (clause.equals !== undefined) {
    return compare(value, valueType, clause.equals, {
      stringOrNumber: (t, v) => explain(t === v, `${t} equals ${v}`),
      date: (t, v) => explain(isSameDay(t, v), `${t} is ${v}`),
    });
  }
  if (clause.gt !== undefined) {
    return compare(value, valueType, clause.gt, {
      stringOrNumber: (t, v) => explain(t > v, `${t} is more than ${v}`),
      date: (t, v) => explain(isAfter(v, t), `${t} is after ${v}`),
    });
  }
  if (clause.gte !== undefined) {
    return compare(value, valueType, clause.gte, {
      stringOrNumber: (t, v) => explain(t >= v, `${t} is or is more than ${v}`),
      date: (t, v) =>
        explain(isSameDay(t, v) || isAfter(v, t), `${t} is or is after ${v}`),
    });
  }
  if (clause.lt !== undefined) {
    return compare(value, valueType, clause.lt, {
      stringOrNumber: (t, v) => explain(t < v, `${t} is less than ${v}`),
      date: (t, v) => explain(isBefore(v, t), `${t} is before ${v}`),
    });
  }
  if (clause.lte !== undefined) {
    return compare(value, valueType, clause.lte, {
      stringOrNumber: (t, v) => explain(t <= v, `${t} is or is less than ${v}`),
      date: (t, v) =>
        explain(isSameDay(t, v) || isBefore(v, t), `${t} is or is before ${v}`),
    });
  }
  if (clause.not !== undefined) {
    return compare(value, valueType, clause.not, {
      stringOrNumber: (t, v) => explain(t !== v, `${t} is not ${v}`),
      date: (t, v) => explain(!isSameDay(t, v), `${t} is not ${v}`),
    });
  }
  if (clause.notContains !== undefined) {
    return compare(value, valueType, clause.notContains, {
      string: (t, v) => explain(!v.includes(t), `${t} doees not contain ${v}`),
    });
  }
  if (clause.notEmpty !== undefined) {
    return explain(
      value !== null && value !== undefined && value !== '',
      `${value} is not empty`,
    );
  }
  if (clause.startsWith !== undefined) {
    return compare(value, valueType, clause.startsWith, {
      string: (t, v) => explain(v.startsWith(t), `${t} starts with ${v}`),
    });
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
