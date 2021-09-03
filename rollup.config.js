import merge from 'deepmerge';
import { createBasicConfig } from '@open-wc/building-rollup';
import typescript from '@rollup/plugin-typescript';

const baseConfig = createBasicConfig();

export default merge(baseConfig, {
  input: './dist/tsc/src/index.js',
  output: [
    {
      file: './dist/omnibus-rxjs.prod.esm.js',
      format: 'es',
      exports: 'named',
      sourcemap: false,
    },
    {
      file: './dist/omnibus-rxjs.esm.js',
      format: 'es',
      exports: 'named',
      sourcemap: true,
    },
    {
      file: './dist/omnibus-rxjs.min.js',
      format: 'cjs',
      sourcemap: true,
    },
  ],
  plugins: [typescript()],
});
