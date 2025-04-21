/** Build table from data to be used within plain text emails. */
export const buildTextTable = (options: {
  headers: {
    key: string;
    label: string;
  }[];
  data: object[];
  width: number;
}) => {
  const { headers, data, width } = options;

  // Prepare column values to include header. This will be used to calculate column widths.
  const columnValues = Object.fromEntries(
    headers.map(({ key, label }) => {
      const columnValues = [label];
      data.forEach((row) => {
        columnValues.push(row[key]);
      });
      return [key, columnValues];
    }),
  );

  // Calculate column widths.
  const columnWidths = calculateColumnWidths(columnValues, width);

  // Format header row.
  const headerRow = formatRow(
    Object.fromEntries(headers.map(({ label, key }) => [key, label])),
    columnWidths,
  );

  const headerUnderline = headers
    .map(({ key }) => '-'.repeat(columnWidths[key]))
    .join(' | ');

  const rows = data.map((row) => {
    return formatRow(row, columnWidths);
  });

  // Combine header, underline, and rows.
  return [headerRow, headerUnderline, ...rows].join('\n');
};

const calculateColumnWidths = (
  columns: Record<string, string[]>,
  width: number,
) => {
  const maxContents = Object.fromEntries(
    Object.entries(columns).map(([columnKey, columnValues]) => {
      const maxLength = Math.max(...columnValues.map((value) => value.length));
      return [columnKey, maxLength];
    }),
  );

  const paddingAndSeparatorTotalWidth = (Object.keys(columns).length - 1) * 3;
  const totalContentWidth = Object.values(maxContents).reduce(
    (acc, curr) => acc + curr,
    0,
  );

  if (totalContentWidth + paddingAndSeparatorTotalWidth <= width) {
    return maxContents;
  }

  // Sort max contents by length in ascending order.
  const sortedMaxContents = Object.entries(maxContents).sort(
    ([, maxLength], [, maxLength2]) => maxLength2 - maxLength,
  );

  let remainingWidth = width - paddingAndSeparatorTotalWidth;
  let remainingColumnCount = Object.keys(columns).length;

  // Initialize new column widths. Use `maxContents` to ensure
  // original order is maintained.
  const columnWidths: Record<string, number> = maxContents;

  for (const [columnKey, maxContentLength] of sortedMaxContents) {
    const maxColumnWidth = Math.floor(remainingWidth / remainingColumnCount);

    const columnWidth = Math.min(maxColumnWidth, maxContentLength);
    remainingWidth -= columnWidth;
    remainingColumnCount--;

    columnWidths[columnKey] = columnWidth;
  }

  return columnWidths;
};

const formatRow = (row: object, columnWidths: Record<string, number>) => {
  return Object.values(row).join(' | ');
};

// TODO: The current implementation leads to memory leaks and doesn't seem to work
// in emails very well. Reverting to simpler approach.
/**
 * Format row to be used within plain text emails. This handles wrapping
 * long column values to fit within the column width.
 */
// const formatRow = (row: object, columnWidths: Record<string, number>) => {
//   // Keep track of words for each column.
//   const columnWordBuffers: Record<string, string[]> = Object.fromEntries(
//     Object.entries(row).map(([columnKey, columnValue]) => {
//       const words = columnValue.split(' ');
//       return [columnKey, words];
//     }),
//   );

//   const rows: string[] = [];
//   let currentRowValues: string[] = [];

//   while (
//     Object.values(columnWordBuffers).some(
//       (columnWords) => columnWords.length > 0,
//     )
//   ) {
//     for (const [columnKey, columnWidth] of Object.entries(columnWidths)) {
//       let currentColumnRow = '';
//       while (true) {
//         const word = columnWordBuffers[columnKey].shift();
//         if (!word) {
//           break;
//         }

//         if (!currentColumnRow.length) {
//           if (word.length <= columnWidth) {
//             currentColumnRow = word;
//           } else {
//             currentColumnRow = word.slice(0, columnWidth - 1) + '-';
//             columnWordBuffers[columnKey].unshift(word.slice(columnWidth - 1));
//           }
//           continue;
//         }

//         if (currentColumnRow.length + (word.length + 1) <= columnWidth) {
//           currentColumnRow += ' ' + word;
//         } else {
//           columnWordBuffers[columnKey].unshift(word);
//           break;
//         }
//       }

//       currentColumnRow += ' '.repeat(columnWidth - currentColumnRow.length);
//       currentRowValues.push(currentColumnRow);
//     }

//     const delimiter = rows.length === 0 ? ' | ' : '   ';
//     rows.push(currentRowValues.join(delimiter));
//     currentRowValues = [];
//   }

//   return rows.join('\n');
// };
