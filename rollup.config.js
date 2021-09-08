import typescript from '@rollup/plugin-typescript';

export default {
  input: './src/index.ts',
  output: [
    {
      file: './dist/omnibus-rxjs.prod.js',
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
};
