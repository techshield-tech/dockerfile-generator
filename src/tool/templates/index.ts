import type { TemplateGenerator, TemplateId, TemplateMeta } from '../types';
import { generateDotnet } from './dotnet';
import { generateGo } from './go';
import { generateNextjs } from './nextjs';
import { generateNode } from './node';
import { generatePhpFpm } from './phpFpm';
import { generatePython } from './python';
import { generateSpringBoot } from './springBoot';
import { generateStaticNginx } from './staticNginx';
import { generateViteReact } from './viteReact';

export const TEMPLATE_GENERATORS: Record<TemplateId, TemplateGenerator> = {
  node: generateNode,
  nextjs: generateNextjs,
  'vite-react': generateViteReact,
  python: generatePython,
  go: generateGo,
  'spring-boot': generateSpringBoot,
  dotnet: generateDotnet,
  'php-fpm': generatePhpFpm,
  'static-nginx': generateStaticNginx,
};

export const TEMPLATE_META: TemplateMeta[] = [
  {
    id: 'node',
    label: 'Node.js',
    defaultBaseVersion: '22',
    showsNodePackageManager: true,
    showsPython: false,
    showsGoBaseImage: false,
    showsJavaBuildTool: false,
  },
  {
    id: 'nextjs',
    label: 'Next.js (standalone)',
    defaultBaseVersion: '22',
    showsNodePackageManager: true,
    showsPython: false,
    showsGoBaseImage: false,
    showsJavaBuildTool: false,
  },
  {
    id: 'vite-react',
    label: 'Vite / React (static, via nginx)',
    defaultBaseVersion: '22',
    showsNodePackageManager: true,
    showsPython: false,
    showsGoBaseImage: false,
    showsJavaBuildTool: false,
  },
  {
    id: 'python',
    label: 'Python',
    defaultBaseVersion: '3.12',
    showsNodePackageManager: false,
    showsPython: true,
    showsGoBaseImage: false,
    showsJavaBuildTool: false,
  },
  {
    id: 'go',
    label: 'Go',
    defaultBaseVersion: '1.23',
    showsNodePackageManager: false,
    showsPython: false,
    showsGoBaseImage: true,
    showsJavaBuildTool: false,
  },
  {
    id: 'spring-boot',
    label: 'Java (Spring Boot)',
    defaultBaseVersion: '21',
    showsNodePackageManager: false,
    showsPython: false,
    showsGoBaseImage: false,
    showsJavaBuildTool: true,
  },
  {
    id: 'dotnet',
    label: '.NET',
    defaultBaseVersion: '8.0',
    showsNodePackageManager: false,
    showsPython: false,
    showsGoBaseImage: false,
    showsJavaBuildTool: false,
  },
  {
    id: 'php-fpm',
    label: 'PHP-FPM',
    defaultBaseVersion: '8.3',
    showsNodePackageManager: false,
    showsPython: false,
    showsGoBaseImage: false,
    showsJavaBuildTool: false,
  },
  {
    id: 'static-nginx',
    label: 'Static site (nginx)',
    defaultBaseVersion: '1.27',
    showsNodePackageManager: false,
    showsPython: false,
    showsGoBaseImage: false,
    showsJavaBuildTool: false,
  },
];

export function templateMetaFor(id: TemplateId): TemplateMeta {
  const meta = TEMPLATE_META.find((entry) => entry.id === id);
  if (!meta) {
    throw new Error(`Unknown template id: ${id}`);
  }
  return meta;
}
