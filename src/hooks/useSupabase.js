import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useSupabase(table, query = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, [table, JSON.stringify(query)]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      let supabaseQuery = supabase.from(table).select(query.select || '*');

      // Ajouter les filtres
      if (query.filters) {
        Object.entries(query.filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            supabaseQuery = supabaseQuery.eq(key, value);
          }
        });
      }

      // Ajouter le tri
      if (query.orderBy) {
        supabaseQuery = supabaseQuery.order(
          query.orderBy.column,
          { ascending: query.orderBy.ascending ?? true }
        );
      }

      // Ajouter la limite
      if (query.limit) {
        supabaseQuery = supabaseQuery.limit(query.limit);
      }

      const { data, error } = await supabaseQuery;

      if (error) throw error;
      setData(data);
    } catch (error) {
      setError(error.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const insert = async (values) => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from(table)
        .insert(values)
        .select();
      if (error) throw error;
      await fetchData(); // Rafraîchir les données
      return data;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const update = async (id, values) => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from(table)
        .update(values)
        .eq('id', id)
        .select();
      if (error) throw error;
      await fetchData(); // Rafraîchir les données
      return data;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id) => {
    try {
      setLoading(true);
      setError(null);
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);
      if (error) throw error;
      await fetchData(); // Rafraîchir les données
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    insert,
    update,
    remove,
  };
}

export default useSupabase;