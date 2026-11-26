import react from '@efe/config/eslint/react';
import { defineConfig } from 'eslint/config';

export default defineConfig(react, { ignores: ['dev-dist/**'] });
