import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir:'./tests/browser',testMatch:'**/*.e2e.ts',fullyParallel:false,workers:1,
  timeout:30000,expect:{timeout:10000},reporter:'list',
  use:{baseURL:'http://127.0.0.1:4173',viewport:{width:1440,height:1000},locale:'zh-CN',trace:'retain-on-failure'},
  webServer:{command:'bun scripts/test-server.ts',url:'http://127.0.0.1:4173',reuseExistingServer:true,timeout:30000},
});
