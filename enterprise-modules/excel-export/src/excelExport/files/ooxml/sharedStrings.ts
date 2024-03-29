import { ExcelOOXMLTemplate, XmlElement, _ } from '@ag-grid-community/core';

const buildSharedString = (textNode: string): XmlElement => ({
  name: 'si',
  children: [
    {
      name: 't',
      textNode: _.utf8_encode(_.escape(textNode.toString()) as any),
    },
  ],
});

const sharedStrings: ExcelOOXMLTemplate = {
  getTemplate(strings: string[]) {
    return {
      name: 'sst',
      properties: {
        rawMap: {
          xmlns: 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
          count: strings.length,
          uniqueCount: strings.length,
        },
      },
      children: strings.map(buildSharedString),
    };
  },
};

export default sharedStrings;
