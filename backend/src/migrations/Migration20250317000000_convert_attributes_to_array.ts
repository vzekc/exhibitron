import { Migration } from '@mikro-orm/migrations'

export class Migration20250317000000_convert_attributes_to_array extends Migration {
  async up(): Promise<void> {
    // Get all exhibits with attributes
    const exhibits = await this.getKnex()
      .select('id', 'attributes')
      .from('exhibit')
      .whereNotNull('attributes')

    // Process each exhibit to convert attributes from object to array format
    for (const exhibit of exhibits) {
      if (
        exhibit.attributes &&
        typeof exhibit.attributes === 'object' &&
        !Array.isArray(exhibit.attributes)
      ) {
        // Convert from Record<string, string> to [string, string][]
        const attributesArray = Object.entries(exhibit.attributes).map(([name, value]) => [
          name,
          value,
        ])

        // Update the exhibit with the new array format
        await this.getKnex()
          .table('exhibit')
          .where('id', exhibit.id)
          .update({ attributes: JSON.stringify(attributesArray) })
      }
    }
  }

  async down(): Promise<void> {
    // Get all exhibits with attributes
    const exhibits = await this.getKnex()
      .select('id', 'attributes')
      .from('exhibit')
      .whereNotNull('attributes')

    // Process each exhibit to convert attributes from array back to object format
    for (const exhibit of exhibits) {
      if (exhibit.attributes && Array.isArray(exhibit.attributes)) {
        // Convert from [string, string][] to Record<string, string>
        // Note: This will lose duplicate keys and ordering
        const attributesObject: Record<string, string> = {}
        for (const [name, value] of exhibit.attributes as [string, string][]) {
          attributesObject[name] = value
        }

        // Update the exhibit with the old object format
        await this.getKnex()
          .table('exhibit')
          .where('id', exhibit.id)
          .update({ attributes: JSON.stringify(attributesObject) })
      }
    }
  }
}
