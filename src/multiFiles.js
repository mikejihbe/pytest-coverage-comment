const { getCoverageReport } = require('./parse');
const { getParsedXml } = require('./junitXml');

// parse oneline from multiple files to object
const parseLine = (line) => {
  if (!line || !line.includes(',')) {
    return '';
  }

  const lineArr = line.split(',');

  return {
    title: lineArr[0].trim(),
    covFile: lineArr[1].trim(),
    xmlFile: lineArr.length > 1 ? lineArr[2].trim() : '',
  };
};

// make internal options
const getOptions = (options = {}, line = {}) => ({
  ...options,
  title: line.title,
  covFile: line.covFile,
  hideReport: true,
  xmlFile: line.xmlFile,
  xmlTitle: '',
});

// return multiple report in markdown format
const getMultipleReport = (options) => {
  const { multipleFiles } = options;

  try {
    const lineReports = multipleFiles.map(parseLine).filter((l) => l);
    const hasXmlReports = lineReports.some((l) => l.xmlFile);
    const miniTable = `| Title | Coverage |
| ----- | ----- | ----- |
`;
    const fullTable = `| Title | Coverage | Tests | Skipped | Failures | Errors | Time |
| ----- | ----- | ----- | ------- | -------- | -------- | ------------------ |
`;
    let table = hasXmlReports ? fullTable : miniTable;

    lineReports.forEach((l) => {
      const internalOptions = getOptions(options, l);
      const coverage = getCoverageReport(internalOptions);
      const summary = getParsedXml(internalOptions);

      table += `| ${l.title} | ${coverage.html}`;
      if (hasXmlReports) {
        const { errors, failures, skipped, tests, time } = summary;
        table += `| ${tests} | ${skipped} :zzz: | ${failures} :x: | ${errors} :fire: | ${time}s :stopwatch: |
`;
      } else {
        table += `
`;
      }
    });

    return table;
  } catch (error) {
    console.log(`Error: on generating summary report`, error);
  }

  return '';
};

module.exports = { getMultipleReport };