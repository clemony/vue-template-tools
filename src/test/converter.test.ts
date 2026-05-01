import * as assert from 'assert';

import { convertAttrsToObject, convertObjectToAttrs, convertSelection, parseAttrs } from '../converter';

suite('Converter', () => {
  test('parses quoted and bound attributes without splitting nested values', () => {
    const input = `
      as="label"
      size="sm"
      :ui="{
        root: 'gap-4 pr-4 pb-4 pl-3',

        label: 'mb-0.5 justifyStart gap-1.5',
        container: 'orderLast mb-1 selfEnd'
      }"
      true-value="true"
      false-value="false"
      color="card"
    `;

    assert.deepStrictEqual(parseAttrs(input), [
      { name: 'as', value: 'label' },
      { name: 'size', value: 'sm' },
      {
        name: ':ui',
        value: `{
        root: 'gap-4 pr-4 pb-4 pl-3',

        label: 'mb-0.5 justifyStart gap-1.5',
        container: 'orderLast mb-1 selfEnd'
      }`,
      },
      { name: 'true-value', value: 'true' },
      { name: 'false-value', value: 'false' },
      { name: 'color', value: 'card' },
    ]);
  });

  test('converts selected attrs into the expected object literal', () => {
    const input = `
      as="label"
      size="sm"
      :ui="{
        root: 'gap-4 pr-4 pb-4 pl-3',

        label: 'mb-0.5 justifyStart gap-1.5',
        container: 'orderLast mb-1 selfEnd'
      }"
      true-value="true"
      false-value="false"
      color="card"
    `;

    assert.strictEqual(convertAttrsToObject(input), `{
  as: 'label',
  size: 'sm',
  ui: {
    root: 'gap-4 pr-4 pb-4 pl-3',

    label: 'mb-0.5 justifyStart gap-1.5',
    container: 'orderLast mb-1 selfEnd'
  },
  trueValue: 'true',
  falseValue: 'false',
  color: 'card',
}`);
  });

  test('normalizes double-quoted strings inside bound expressions', () => {
    const input = `
      :ui='{
        root: "gap-4 pr-4 pb-4 pl-3",
        label: "Save \\"changes\\"",
        title: "Owner panel"
      }'
    `;

    assert.strictEqual(convertAttrsToObject(input), `{
  ui: {
    root: 'gap-4 pr-4 pb-4 pl-3',
    label: 'Save "changes"',
    title: 'Owner panel'
  },
}`);
  });

  test('converts object literals back into attrs', () => {
    const input = `{
  as: "label",
  size: "sm",
  ui: {
    root: "gap-4 pr-4 pb-4 pl-3",

    label: "mb-0.5 justifyStart gap-1.5",
    container: "orderLast mb-1 selfEnd"
  },
  trueValue: "true",
  falseValue: "false",
  color: "card",
}`;

    assert.strictEqual(convertObjectToAttrs(input), `as="label"
size="sm"
:ui='{
  root: "gap-4 pr-4 pb-4 pl-3",

  label: "mb-0.5 justifyStart gap-1.5",
  container: "orderLast mb-1 selfEnd"
}'
true-value="true"
false-value="false"
color="card"`);
  });

  test('toggles object literals with the same conversion entrypoint', () => {
    const input = `{
  disabled: true,
  count: 2,
  label: "hello"
}`;

    assert.strictEqual(convertSelection(input), `disabled
:count="2"
label="hello"`);
  });
});
