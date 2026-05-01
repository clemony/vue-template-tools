import * as assert from 'assert';

import { convertClassSelection } from '../class-cn';

suite('Class cn Converter', () => {
  test('converts static class attributes to cn bindings', () => {
    assert.strictEqual(
      convertClassSelection('class="grid w-full auto-rows-fr gap-y-0.5 py-1 pl-1"'),
      ':class="cn(\'grid w-full auto-rows-fr gap-y-0.5 py-1 pl-1\')"',
    );
  });

  test('converts cn bindings back to static class attributes', () => {
    assert.strictEqual(
      convertClassSelection(':class="cn(\'grid w-full\', isActive && \'text-primary\', props.class)"'),
      'class="grid w-full"',
    );
  });

  test('keeps only the first string when converting class bindings back', () => {
    assert.strictEqual(
      convertClassSelection(':class="clsx(\'grid w-full\', { hidden: closed }, otherClass)"'),
      'class="grid w-full"',
    );
  });
});
