import { Migration } from '@mikro-orm/migrations'

export class Migration20250412065111_powerdns_host_trigger extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
CREATE TRIGGER sync_host_dns
    AFTER INSERT OR UPDATE OR DELETE ON public.host
    FOR EACH ROW
    EXECUTE FUNCTION dns.sync_host_dns();
`)
  }

  override async down(): Promise<void> {
    this.addSql(`
DROP TRIGGER sync_host_dns ON public.host;
    `)
  }
}
