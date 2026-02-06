import { supabase } from '../lib/supabase';
import type { MaterialKit, MaterialItem } from '../../types';

// The material_kits table is defined in migration 20260207 but not yet in generated types.
// Use a typed helper to access it until types are regenerated.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const kitsTable = () => (supabase as any).from('material_kits');

// Map DB row (snake_case) to MaterialKit (camelCase)
function toMaterialKit(row: any): MaterialKit {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description || undefined,
    items: (row.items || []) as MaterialItem[],
    category: row.category || undefined,
    isFavourite: row.is_favourite ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const materialKitsService = {
  async getAll(): Promise<MaterialKit[]> {
    const { data, error } = await kitsTable()
      .select('*')
      .order('name');
    if (error) throw error;
    return (data || []).map(toMaterialKit);
  },

  async getById(id: string): Promise<MaterialKit> {
    const { data, error } = await kitsTable()
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return toMaterialKit(data);
  },

  async getFavourites(): Promise<MaterialKit[]> {
    const { data, error } = await kitsTable()
      .select('*')
      .eq('is_favourite', true)
      .order('name');
    if (error) throw error;
    return (data || []).map(toMaterialKit);
  },

  async getByCategory(category: string): Promise<MaterialKit[]> {
    const { data, error } = await kitsTable()
      .select('*')
      .eq('category', category)
      .order('name');
    if (error) throw error;
    return (data || []).map(toMaterialKit);
  },

  async getCategories(): Promise<string[]> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return [];
    const { data, error } = await kitsTable()
      .select('category')
      .eq('user_id', user.id)
      .not('category', 'is', null);
    if (error) throw error;
    const categories = [...new Set((data || []).map((d: any) => d.category).filter(Boolean) as string[])];
    return categories.sort();
  },

  async create(kit: { name: string; description?: string; items: MaterialItem[]; category?: string }): Promise<MaterialKit> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await kitsTable()
      .insert({
        user_id: user.id,
        name: kit.name,
        description: kit.description || null,
        items: JSON.parse(JSON.stringify(kit.items)),
        category: kit.category || null,
      })
      .select()
      .single();
    if (error) throw error;
    return toMaterialKit(data);
  },

  async update(id: string, updates: { name?: string; description?: string; items?: MaterialItem[]; category?: string }): Promise<MaterialKit> {
    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description || null;
    if (updates.items !== undefined) updateData.items = JSON.parse(JSON.stringify(updates.items));
    if (updates.category !== undefined) updateData.category = updates.category || null;

    const { data, error } = await kitsTable()
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return toMaterialKit(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await kitsTable()
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async toggleFavourite(id: string): Promise<MaterialKit> {
    const { data: current, error: fetchError } = await kitsTable()
      .select('is_favourite')
      .eq('id', id)
      .single();
    if (fetchError) throw fetchError;

    const { data, error } = await kitsTable()
      .update({ is_favourite: !(current as any)?.is_favourite, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return toMaterialKit(data);
  },
};
