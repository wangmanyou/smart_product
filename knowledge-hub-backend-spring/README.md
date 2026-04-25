# Knowledge Hub Spring Backend

This is a fresh Spring Boot backend for local development with the existing React/Umi frontend.

## Run locally

Make sure MySQL is available at `127.0.0.1:13306`, database `knowledge`, user `root`, password `root`.

```powershell
cd knowledge-hub-backend-spring
mvn spring-boot:run
```

The service listens on:

```text
http://127.0.0.1:8001
```

The frontend proxy should keep using `/api` with rewrite to this backend:

```ts
proxy: {
  '/api': {
    target: 'http://127.0.0.1:8001',
    changeOrigin: true,
    pathRewrite: { '^/api': '' },
  },
}
```

Default admin for a newly initialized database:

```text
admin / Admin888888
```
