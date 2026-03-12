/**
 * offlineSync.js
 * Utilidades para manejar caché local y cola de operaciones offline
 */

const CACHE_KEY_PRODUCTS = 'abarrotesaas_products_cache';
const QUEUE_KEY = 'abarrotesaas_offline_queue';

import { supabase } from '../services/supabase';

// --- CACHÉ DE PRODUCTOS ---

export const getCachedProducts = () => {
  try {
    const data = localStorage.getItem(CACHE_KEY_PRODUCTS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error leyendo caché de productos', error);
    return [];
  }
};

export const setCachedProducts = (products) => {
  try {
    localStorage.setItem(CACHE_KEY_PRODUCTS, JSON.stringify(products));
  } catch (error) {
    console.error('Error guardando caché de productos', error);
  }
};

// --- COLA DE OPERACIONES OFFLINE ---

export const getOfflineQueue = () => {
  try {
    const data = localStorage.getItem(QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error leyendo cola offline', error);
    return [];
  }
};

export const clearOfflineQueue = () => {
  localStorage.removeItem(QUEUE_KEY);
};

/**
 * Añade una operación a la cola
 * @param {string} type 'INSERT' | 'UPDATE' | 'DELETE' | 'STOCK_ADJUST'
 * @param {string} table Nombre de la tabla (ej. 'products', 'inventory_logs')
 * @param {object} payload Datos de la operación
 */
export const addToOfflineQueue = (type, table, payload) => {
  try {
    const queue = getOfflineQueue();
    queue.push({
      id: crypto.randomUUID(), // ID único para la operación en la cola
      type,
      table,
      payload,
      timestamp: Date.now()
    });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('Error añadiendo a cola offline', error);
  }
};

/**
 * Procesa todas las operaciones encoladas cuando vuelve el internet
 */
export const syncOfflineData = async () => {
  const queue = getOfflineQueue();
  if (!queue || queue.length === 0) return;

  console.log(`[OfflineSync] Sincronizando ${queue.length} operaciones pendientes...`);
  const failedOps = [];

  for (const op of queue) {
    try {
      if (op.type === 'INSERT') {
        const payloadToInsert = { ...op.payload };
        if (op.table === 'products') {
          delete payloadToInsert.min_stock;
          delete payloadToInsert.unit;
        }
        const { error } = await supabase.from(op.table).insert([payloadToInsert]);
        if (error) throw error;
      } else if (op.type === 'UPDATE') {
        const payloadToUpdate = { ...op.payload };
        if (op.table === 'products') {
          delete payloadToUpdate.min_stock;
          delete payloadToUpdate.unit;
        }
        const { error } = await supabase.from(op.table).update(payloadToUpdate).eq('id', op.payload.id);
        if (error) throw error;
      } else if (op.type === 'DELETE') {
        const { error } = await supabase.from(op.table).delete().eq('id', op.payload.id);
        if (error) throw error;
      } else if (op.type === 'STOCK_ADJUST') {
        // Obtenemos último stock real
        const { data: dbProduct } = await supabase.from('products').select('stock').eq('id', op.payload.product_id).single();
        if (dbProduct) {
          let newStock = dbProduct.stock;
          if (op.payload.adjustType === 'entrada') newStock += op.payload.qty;
          if (op.payload.adjustType === 'salida' || op.payload.adjustType === 'ajuste') newStock -= op.payload.qty;
          if (newStock < 0) newStock = 0;
          
          await supabase.from('products').update({ stock: newStock }).eq('id', op.payload.product_id);
          
          await supabase.from('inventory_logs').insert([{
            product_id: op.payload.product_id,
            type: op.payload.adjustType,
            quantity: op.payload.qty,
            reason: op.payload.reason || 'Sincronización offline'
          }]);
        }
      } else if (op.type === 'SALE') {
        // Procesar Venta Offline
        const { saleData: saleDataToInsert, saleItems: saleItemsToInsert, cart } = op.payload;
        // 1. Crear Venta
        const { data: saleData, error: saleError } = await supabase
          .from('sales')
          .insert([saleDataToInsert])
          .select()
          .single();
        if (saleError) throw saleError;
        // 2. Insertar Items
        const saleItems = saleItemsToInsert.map(item => ({
          ...item,
          sale_id: saleData.id // usar ID real generado por Supabase
        }));
        const { error: itemsError } = await supabase.from('sale_items').insert(saleItems);
        if (itemsError) throw itemsError;
        // 3. Decrementar stock
        for (const item of cart) {
          const { data: dbProd } = await supabase.from('products').select('stock').eq('id', item.product_id).single();
          if (dbProd) {
            await supabase.from('products').update({ stock: dbProd.stock - item.qty }).eq('id', item.product_id);
          }
        }
      }
      console.log(`[OfflineSync] Operación ${op.type} sincronizada.`);
    } catch (error) {
      console.error(`[OfflineSync] Error sincronizando operación ${op.type}:`, error);
      // Mantener en cola si falla
      failedOps.push(op);
    }
  }

  if (failedOps.length > 0) {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(failedOps));
    console.warn(`[OfflineSync] ${failedOps.length} operaciones fallaron y siguen en cola.`);
  } else {
    clearOfflineQueue();
  }
  
  console.log('[OfflineSync] Proceso de sincronización completado.');
  // Despachar evento global para que las vistas puedan refrescar
  window.dispatchEvent(new Event('offline-sync-complete'));
};
