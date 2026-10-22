import './styles/base.css';
import './styles/print.css';
import { startRouter, type Route } from './ui/router';
import { buildShell } from './ui/shell';
import { renderAfter } from './ui/pages/after';
import { renderPlan } from './ui/pages/plan';
import { renderResources } from './ui/pages/resources';
import { renderTask1 } from './ui/pages/task1';
import { renderTask2 } from './ui/pages/task2';
import { renderTask3 } from './ui/pages/task3';
import { renderTask4 } from './ui/pages/task4';
import { restoreRoom } from './sync/room';
import { onClear } from './ui/state';

const app = document.getElementById('app')!;

const routes: Route[] = [
  { path: '/', title: 'Plan', nav: 'Plan', render: renderPlan },
  { path: '/task-1', title: 'Task 1: Observations to themes', nav: 'Task 1', render: renderTask1 },
  { path: '/task-2', title: 'Task 2: Critique and refine', nav: 'Task 2', render: renderTask2 },
  { path: '/task-3', title: 'Task 3: Implications', nav: 'Task 3', render: renderTask3 },
  { path: '/task-4', title: 'Task 4: Reflection post', nav: 'Task 4', render: renderTask4 },
  { path: '/after', title: 'After the workshop', nav: 'After', render: renderAfter },
  { path: '/resources', title: 'Resources and extensions', nav: 'Resources', render: renderResources },
];

const shell = buildShell(app, routes);
const router = startRouter(shell.main, routes, (r) => shell.setActive(r));
onClear(() => router.rerender());
restoreRoom();

if (__TUTOR__) {
  import('./tutor').then((m) => m.mountTutor(app));
}
