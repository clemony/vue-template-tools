# Vue Template Tools

A small set of selection-based converters for Vue and Nuxt templates.

## Commands

### Convert Selected Attributes to Object

Toggles between Vue/HTML attributes and a TypeScript object literal.

Attributes:

```vue
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
```

Object:

```ts
{
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
}
```

### Toggle Class Attribute and cn() Binding

Toggles a static `class` attribute into a `cn()` class binding.

Static class:

```vue
class="grid w-full auto-rows-fr gap-y-0.5 py-1 pl-1"
```

`cn()` binding:

```vue
:class="cn('grid w-full auto-rows-fr gap-y-0.5 py-1 pl-1')"
```

When converting back, only the first string argument is kept. This intentionally removes the merge function, leading colon, and any conditional or extra class arguments:

```vue
:class="cn('grid w-full', isActive && 'text-primary', props.class)"
```

becomes:

```vue
class="grid w-full"
```

## Notes

- Boolean attributes become `true` when converting attrs to objects.
- Bound attributes such as `:foo="bar"` keep the bound expression as-is.
- Hyphenated attrs such as `true-value` become camel-cased keys like `trueValue`.
- Object output prefers single-quoted string values.
- When converting objects back to attrs, non-string expressions are emitted as bound attrs such as `:count="2"`.

## Development

- Run `pnpm install`
- Run `pnpm run compile`
- Press `F5` in VS Code to launch the Extension Development Host
