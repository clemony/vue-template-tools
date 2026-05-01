# Vue Attrs to Object

Toggle a selection between Vue/HTML attributes and a TypeScript object literal.

## Usage

1. Select Vue/HTML attributes or an object literal.
2. Open the Command Palette and run `Vue: Convert Selected Attributes to Object`.
3. The selected text is replaced with the converted form.

You can also right-click a selection in the editor and run the same command from the context menu.

## Example

Input:

```vue
as="label"
size="sm"
:ui="{ root: 'gap-4 pr-4 pb-4 pl-3' }"
true-value="true"
false-value="false"
color="card"
```

Object output:

```ts
{
  as: "label",
  size: "sm",
  ui: { root: 'gap-4 pr-4 pb-4 pl-3' },
  trueValue: "true",
  falseValue: "false",
  color: "card",
}
```

Reverse output:

```vue
as="label"
size="sm"
:ui="{ root: 'gap-4 pr-4 pb-4 pl-3' }"
true-value="true"
false-value="false"
color="card"
```

## Notes

- Boolean attributes become `true`.
- Bound attributes such as `:foo="bar"` keep the bound expression as-is.
- Hyphenated attrs such as `true-value` become camel-cased keys like `trueValue`.
- When converting back to attrs, non-string expressions are emitted as bound attrs such as `:count="2"`.

## Development

- Run `pnpm install`
- Run `pnpm run compile`
- Press `F5` in VS Code to launch the Extension Development Host
