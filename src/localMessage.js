/**
 * This file provides the mock "data" received
 * by your visualization code when you develop
 * locally.
 *
 */
export const message = {
  tables: {
    DEFAULT: [
      {
        dateDimension: ['20230101'],
      },
      {
        dateDimension: ['20230102'],
      },
      {
        dateDimension: ['20230115'],
      }
    ],
  },
  fields: {
    dateDimension: [
      {
        id: 'qt_mock_date_id',
        name: 'Date',
        type: 'YEAR_MONTH_DAY',
        concept: 'DIMENSION',
      },
    ],
  },
  style: {
    fontColor: {
      value: { color: '#000000' },
      defaultValue: { color: '#000000' },
    },
    fontFamily: {
      value: 'Roboto',
      defaultValue: 'Roboto',
    },
    backgroundColor: {
      value: { color: '#ffffff' },
      defaultValue: { color: '#ffffff' },
    },
    borderRadius: {
      value: '4',
      defaultValue: '4',
    },
    opacity: {
        value: '1',
        defaultValue: '1',
    }
  },
};
