# Natsu

一个基于 Tauri v2 构建的跨平台桌面应用。

## 技术栈

- **前端**: TypeScript + Vite
- **后端**: Rust + Tauri v2

## 开发

### 环境要求

- Node.js 18+
- Rust (latest stable)
- 系统依赖: 参考 [Tauri 官方文档](https://tauri.app/start/prerequisites/)

### 启动开发服务器

```bash
npm install
npm run tauri dev
```

### 构建

```bash
npm run tauri build
```

## 项目结构

```
natsu/
├── src/                 # 前端源码
├── src-tauri/           # Rust 后端源码
│   ├── src/
│   │   ├── main.rs      # 应用入口
│   │   └── lib.rs       # 核心逻辑
│   ├── Cargo.toml       # Rust 依赖
│   └── tauri.conf.json  # Tauri 配置
├── package.json
└── vite.config.ts
```

## License

MIT
