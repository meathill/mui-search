// Vite 在构建期通过 `define` 注入 process.env.*，此处提供最小的类型声明。
declare const process: {
  env: {
    PUBLIC_URL?: string;
    SITE_URL?: string;
    WIDGET_VERSION?: string;
    APP_VERSION?: string;
  };
};
