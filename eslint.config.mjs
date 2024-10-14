import js from '@eslint/js';
import typescriptEslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default typescriptEslint.config(
	js.configs.recommended,
	...typescriptEslint.configs.recommended,
	{
		plugins: {
			typescriptEslint: typescriptEslint
		},
		languageOptions: {
			parserOptions: {
				tsconfigRootDir: import.meta.dirname,
				projectFolderIgnoreList: ['node_modules', 'build']
			}
		},
		ignores: ['node_modules/*', 'build/**/*', '**/*.d.ts'],
		rules: {
			'@typescript-eslint/no-explicit-any': 'off'
		}
	},
	eslintConfigPrettier
);
