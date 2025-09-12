# Backend service for the CC-Katalog

## Database cheat sheet:

    npx mikro-orm-esm migration:up
    npx mikro-orm-esm migration:create [--initial]
    npx mikro-orm-esm seeder:run -c TestSeeder

## Testing

### Log Levels

By default, tests run with `fatal` log level to minimize output and improve performance. To enable more verbose logging for debugging:

```bash
# Run tests with debug logging
pnpm test:debug

# Run tests in watch mode with debug logging
pnpm test:debug:watch

# Or set the environment variable manually
TEST_LOG_LEVEL=debug pnpm test
```

Available log levels: `fatal`, `error`, `warn`, `info`, `debug`, `trace`
