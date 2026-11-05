// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable,
  RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { API_BASE_URL } from '../../constants/config';
import { createFormula, deleteFormula, getFormulas, restoreFormula, updateFormula } from '../../services/formula.service';
import { insumoService } from '../../services/insumo.service';
import { notificationService } from '../../services/notification.service';
import type { Formula, FormulaIngredient } from '../../types/formula.types';
import type { Insumo } from '../../types/insumo.types';
import { validateFormula } from '../../utils/validators';
import { Fonts, Spacing } from '../constants/theme';

const UNIT_OPTIONS = ['Litros', 'Toneladas', 'Kilogramos'];
const GALLON_OPTIONS = [{ label: '1 Litro', value: '1' }, { label: '20 Litros', value: '20' }];

type FormulaForm = {
  name: string;
  description: string;
  standardBatch: string;
  unit: string;
  productionTime: string;
  preparationCost: string;
  suggestedPrice: string;
  recipeVersion: string;
  ingredients: FormulaIngredient[];
  gallonType: string;
  stockQuantity: string;
  status: boolean;
};

const emptyIngredient = (): FormulaIngredient => ({ supply_id: '', supply_name: '', quantity_required: 0, percentage: 0 });
const emptyFormula = (): FormulaForm => ({
  name: '', description: '', standardBatch: '1', unit: '',
  productionTime: '0', preparationCost: '0', suggestedPrice: '0',
  recipeVersion: '1.0', ingredients: [emptyIngredient()],
  gallonType: '', stockQuantity: '0', status: true,
});

export default function FormulaScreen() {
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [form, setForm] = useState<FormulaForm>(emptyFormula());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const [showGallonPicker, setShowGallonPicker] = useState(false);
  const [openIngredient, setOpenIngredient] = useState<number | null>(null);
  const [ingredientSearch, setIngredientSearch] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const [formulaData, insumoData] = await Promise.all([getFormulas(), insumoService.list()]);
      setFormulas(formulaData || []);
      setInsumos(insumoData || []);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo conectar.');
    } finally { setLoading(false); setRefreshing(false); }
  };
  useEffect(() => { const initialLoad = async () => { await load(); }; void initialLoad(); }, []);

  const visibleFormulas = useMemo(() => formulas.filter((f) => showInactive || f.status), [formulas, showInactive]);
  const activeInsumos = useMemo(() => insumos.filter((i) => i.status), [insumos]);

  const updateField = (field: keyof FormulaForm, value: string) => setForm((c) => ({ ...c, [field]: value }));
  const updateIngredient = (index: number, field: keyof FormulaIngredient, value: string | number) =>
    setForm((c) => ({ ...c, ingredients: c.ingredients.map((ing, i) => i === index ? { ...ing, [field]: value } : ing) }));
  const addIngredient = () => setForm((c) => ({ ...c, ingredients: [...c.ingredients, emptyIngredient()] }));
  const removeIngredient = (index: number) =>
    setForm((c) => ({ ...c, ingredients: c.ingredients.length > 1 ? c.ingredients.filter((_, i) => i !== index) : c.ingredients }));
  const selectInsumo = (index: number, insumo: Insumo) => {
    updateIngredient(index, 'supply_id', insumo.id);
    updateIngredient(index, 'supply_name', insumo.name);
    setIngredientSearch((c) => ({ ...c, [index]: '' }));
    setOpenIngredient(null);
  };

  const startEditing = (formula: Formula) => {
    const inventory = Array.isArray(formula.formula_inventory) ? formula.formula_inventory[0] : formula.formula_inventory;
    setEditingId(formula._id || formula.id || null);
    setForm({
      name: formula.name || '',
      description: formula.description || '',
      standardBatch: String(formula.standard_batch ?? 1),
      unit: formula.unit || '',
      productionTime: String(formula.production_time ?? 0),
      preparationCost: String(formula.preparation_cost ?? 0),
      suggestedPrice: String(formula.suggested_price ?? 0),
      recipeVersion: formula.recipe?.version || '1.0',
      ingredients: formula.recipe?.ingredients?.length
        ? formula.recipe.ingredients.map((ing) => ({ ...ing, quantity_required: Number(ing.quantity_required || 0), percentage: Number(ing.percentage || 0) }))
        : [emptyIngredient()],
      gallonType: String(inventory?.gallon_type ?? ''),
      stockQuantity: String(inventory?.stock_quantity ?? 0),
      status: formula.status,
    });
    setOpenIngredient(null);
    setIngredientSearch({});
  };
  const resetForm = () => { setEditingId(null); setOpenIngredient(null); setIngredientSearch({}); setShowUnitPicker(false); setShowGallonPicker(false); setForm(emptyFormula()); };

  const save = async () => {
    const validationError = validateFormula({
      name: form.name,
      description: form.description,
      standardBatch: form.standardBatch,
      unit: form.unit,
      productionTime: form.productionTime,
      suggestedPrice: form.suggestedPrice,
      recipeVersion: form.recipeVersion,
      ingredients: form.ingredients.map((ing) => ({ supply_id: ing.supply_id, quantity_required: ing.quantity_required, percentage: ing.percentage })),
      gallonType: form.gallonType,
      stockQuantity: form.stockQuantity,
    });
    if (validationError) { showMessage('Revisa el formulario', validationError); return; }

    setSaving(true);
    const today = new Date().toISOString().slice(0, 10);
    const formulaPayload: Formula = {
      ...(editingId ? { _id: editingId } : { _id: `FOR${String(formulas.length + 1).padStart(3, '0')}` }),
      name: form.name.trim(),
      description: form.description.trim(),
      standard_batch: Number(form.standardBatch) || 1,
      unit: form.unit.trim(),
      production_time: Number(form.productionTime) || 0,
      preparation_cost: Number(form.preparationCost) || 0,
      suggested_price: Number(form.suggestedPrice) || 0,
      status: form.status,
      recipe: {
        version: form.recipeVersion.trim() || '1.0',
        ingredients: form.ingredients.map((ing) => ({ ...ing, quantity_required: Number(ing.quantity_required) || 0, percentage: Number(ing.percentage) || 0 })),
      },
      formula_inventory: [{ gallon_type: Number(form.gallonType) || 1, stock_quantity: Number(form.stockQuantity) || 0, last_update: today }],
    };
    const formulaName = form.name.trim();
    const isEditing = Boolean(editingId);
    try {
      if (editingId) await updateFormula(editingId, formulaPayload);
      else await createFormula(formulaPayload);
      resetForm();
      await load(true);
      void notificationService.notifyActionSuccess(
        isEditing ? 'actualizada' : 'registrada',
        'Fórmula',
        formulaName,
      );
    } catch (requestError) {
      showMessage('No se pudo guardar', requestError instanceof Error ? requestError.message : 'Error inesperado.');
    } finally { setSaving(false); }
  };

  const changeStatus = async (formula: Formula) => {
    const id = formula._id || formula.id || '';
    try {
      if (formula.status) await deleteFormula(id);
      else await restoreFormula(id);
      await load(true);
    } catch (requestError) {
      showMessage('No se pudo actualizar el estado', requestError instanceof Error ? requestError.message : 'Error inesperado.');
    }
  };
  const confirmStatus = (formula: Formula) => {
    const action = formula.status ? 'desactivar' : 'restaurar';
    if (Platform.OS === 'web') { if (window.confirm(`¿Quieres ${action} la fórmula ${formula.name}?`)) void changeStatus(formula); }
    else Alert.alert(formula.status ? 'Desactivar fórmula' : 'Restaurar fórmula', `¿Quieres ${action} ${formula.name}?`, [{ text: 'Cancelar', style: 'cancel' }, { text: formula.status ? 'Desactivar' : 'Restaurar', onPress: () => void changeStatus(formula) }]);
  };
  function showMessage(title: string, message: string) { if (Platform.OS === 'web') window.alert(`${title}\n\n${message}`); else Alert.alert(title, message); }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTextWrap}>
              <Text style={styles.eyebrow}>AGROTECNO</Text>
              <Text style={styles.title}>Gestión de Fórmulas</Text>
              <Text style={styles.subtitle}>Crea y administra recetas e ingredientes.</Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.count}>{formulas.filter((f) => f.status).length}</Text>
              <Text style={styles.countLabel}>activas</Text>
            </View>
          </View>

          {/* Formulario */}
          <View style={styles.formCard}>
            <View style={styles.formHeading}>
              <Text style={styles.sectionTitle}>{editingId ? 'Editar fórmula' : 'Nueva fórmula'}</Text>
              {editingId && <Pressable onPress={resetForm}><Text style={styles.cancel}>Cancelar</Text></Pressable>}
            </View>

            {/* Nombre y lote */}
            <View style={styles.row}>
              <Field label="Nombre * (solo letras, mín. 10)" value={form.name} placeholder="Fórmula Nitrógeno Plus" onChangeText={(v) => updateField('name', v)} />
              <Field label="Lote estándar * (> 0)" value={form.standardBatch} placeholder="100" onChangeText={(v) => updateField('standardBatch', v)} keyboardType="numeric" />
            </View>

            <Field label="Descripción * (solo letras, mín. 10)" value={form.description} placeholder="Descripción de la fórmula" onChangeText={(v) => updateField('description', v)} />

            {/* Unidad selector */}
            <View style={[styles.field, { zIndex: 300 }]}>
              <Text style={styles.label}>Unidad *</Text>
              <Pressable style={[styles.input, styles.picker]} onPress={() => { setShowUnitPicker((c) => !c); setShowGallonPicker(false); }}>
                <Text style={form.unit ? styles.pickerText : styles.placeholder}>{form.unit || 'Seleccionar unidad...'}</Text>
                <Text>▼</Text>
              </Pressable>
              {showUnitPicker && (
                <View style={styles.dropdown}>
                  {UNIT_OPTIONS.map((opt) => (
                    <Pressable key={opt} style={styles.dropdownItem} onPress={() => { updateField('unit', opt); setShowUnitPicker(false); }}>
                      <Text style={styles.dropdownText}>{opt}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {/* Tiempos y precios */}
            <View style={styles.row}>
              <Field label="Tiempo producción * (> 0)" value={form.productionTime} placeholder="60" onChangeText={(v) => updateField('productionTime', v)} keyboardType="numeric" />
              <Field label="Precio sugerido * (> 0)" value={form.suggestedPrice} placeholder="0" onChangeText={(v) => updateField('suggestedPrice', v)} keyboardType="decimal-pad" />
            </View>
            <Field label="Costo de preparación" value={form.preparationCost} placeholder="0" onChangeText={(v) => updateField('preparationCost', v)} keyboardType="decimal-pad" />

            {/* Receta */}
            <Text style={styles.subsection}>Receta</Text>
            <Field label="Versión (mín. 2 caracteres, ej: 1.0, v2)" value={form.recipeVersion} placeholder="1.0" onChangeText={(v) => updateField('recipeVersion', v)} />

            {form.ingredients.map((ing, index) => {
              const search = (ingredientSearch[index] || '').trim().toLowerCase();
              const matches = activeInsumos.filter((ins) => `${ins.name} ${ins.id}`.toLowerCase().includes(search));
              return (
                <View key={`ing-${index}`} style={styles.ingredientBox}>
                  <View style={styles.formHeading}>
                    <Text style={styles.label}>Ingrediente {index + 1}</Text>
                    {form.ingredients.length > 1 && (
                      <Pressable onPress={() => removeIngredient(index)}><Text style={styles.deleteAction}>Quitar</Text></Pressable>
                    )}
                  </View>
                  <Text style={styles.label}>Insumo *</Text>
                  <Pressable style={[styles.input, styles.picker]} onPress={() => setOpenIngredient(openIngredient === index ? null : index)}>
                    <Text style={ing.supply_name ? styles.pickerText : styles.placeholder}>{ing.supply_name || 'Seleccionar insumo...'}</Text>
                    <Text>▼</Text>
                  </Pressable>
                  {openIngredient === index && (
                    <View style={styles.dropdown}>
                      <TextInput
                        autoFocus style={styles.searchInput} placeholder="Buscar por nombre o código..."
                        placeholderTextColor="#94A3B8" value={ingredientSearch[index] || ''}
                        onChangeText={(v) => setIngredientSearch((c) => ({ ...c, [index]: v }))}
                      />
                      {matches.length === 0
                        ? <Text style={styles.placeholder}>No hay coincidencias</Text>
                        : matches.map((ins) => (
                          <Pressable key={ins.id} style={styles.dropdownItem} onPress={() => selectInsumo(index, ins)}>
                            <Text style={styles.dropdownName}>{ins.name}</Text>
                            <Text style={styles.dropdownSub}>{ins.id} · {ins.unit}</Text>
                          </Pressable>
                        ))}
                    </View>
                  )}
                  <View style={styles.row}>
                    <Field label="Cantidad * (> 0)" value={String(ing.quantity_required)} placeholder="0" onChangeText={(v) => updateIngredient(index, 'quantity_required', Number(v) || 0)} keyboardType="decimal-pad" />
                    <Field label="Porcentaje % * (> 0)" value={String(ing.percentage)} placeholder="0" onChangeText={(v) => updateIngredient(index, 'percentage', Number(v) || 0)} keyboardType="decimal-pad" />
                  </View>
                </View>
              );
            })}

            <Pressable style={styles.secondaryButton} onPress={addIngredient}>
              <Text style={styles.secondaryText}>+ Añadir ingrediente</Text>
            </Pressable>

            {/* Inventario de fórmula */}
            <Text style={styles.subsection}>Inventario de fórmula</Text>

            {/* Tipo de galón selector */}
            <View style={[styles.field, { zIndex: 200 }]}>
              <Text style={styles.label}>Tipo de galón *</Text>
              <Pressable style={[styles.input, styles.picker]} onPress={() => { setShowGallonPicker((c) => !c); setShowUnitPicker(false); }}>
                <Text style={form.gallonType ? styles.pickerText : styles.placeholder}>
                  {form.gallonType ? GALLON_OPTIONS.find((g) => g.value === form.gallonType)?.label ?? form.gallonType : 'Seleccionar tipo de galón...'}
                </Text>
                <Text>▼</Text>
              </Pressable>
              {showGallonPicker && (
                <View style={styles.dropdown}>
                  {GALLON_OPTIONS.map((opt) => (
                    <Pressable key={opt.value} style={styles.dropdownItem} onPress={() => { updateField('gallonType', opt.value); setShowGallonPicker(false); }}>
                      <Text style={styles.dropdownText}>{opt.label}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            <Field label="Cantidad en stock (≥ 0)" value={form.stockQuantity} placeholder="0" onChangeText={(v) => updateField('stockQuantity', v)} keyboardType="numeric" />
            <View style={styles.autoInfo}><Text style={styles.autoText}>📅 La fecha de última actualización se registra automáticamente.</Text></View>

            <Pressable style={styles.primaryButton} onPress={() => void save()} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{editingId ? 'Guardar cambios' : 'Registrar fórmula'}</Text>}
            </Pressable>
          </View>

          {/* Lista */}
          <View style={styles.listHeading}>
            <Text style={styles.sectionTitle}>Fórmulas registradas</Text>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Ver inactivas</Text>
              <Switch value={showInactive} onValueChange={setShowInactive} trackColor={{ false: '#CBD5E1', true: '#0F766E' }} thumbColor="#fff" />
            </View>
          </View>

          {loading ? <ActivityIndicator color="#0F766E" /> : error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorTitle}>No se pudo cargar las fórmulas</Text>
              <Text style={styles.errorText}>{error}</Text>
              <Text style={styles.connectionText}>Backend: {API_BASE_URL}</Text>
              <Pressable onPress={() => void load()}><Text style={styles.retry}>Reintentar</Text></Pressable>
            </View>
          ) : visibleFormulas.length === 0 ? (
            <Text style={styles.empty}>No hay fórmulas para mostrar.</Text>
          ) : visibleFormulas.map((formula) => (
            <FormulaCard key={formula._id || formula.id} formula={formula} onEdit={startEditing} onStatusChange={confirmStatus} />
          ))}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...props} style={styles.input} placeholderTextColor="#94A3B8" /></View>;
}

function FormulaCard({ formula, onEdit, onStatusChange }: { formula: Formula; onEdit: (f: Formula) => void; onStatusChange: (f: Formula) => void }) {
  const inventory = Array.isArray(formula.formula_inventory) ? formula.formula_inventory[0] : formula.formula_inventory;
  return (
    <View style={[styles.itemCard, !formula.status && styles.inactiveCard]}>
      <View style={styles.itemTop}>
        <View><Text style={styles.itemId}>{formula._id || formula.id}</Text><Text style={styles.itemName}>{formula.name}</Text></View>
        <Text style={[styles.statusPill, { color: formula.status ? '#166534' : '#991B1B', backgroundColor: formula.status ? '#DCFCE7' : '#FEE2E2' }]}>{formula.status ? 'Activa' : 'Inactiva'}</Text>
      </View>
      <Text style={styles.itemDescription}>{formula.description || 'Sin descripción'}</Text>
      <View style={styles.metrics}>
        <Metric label="Lote" value={`${formula.standard_batch} ${formula.unit}`} />
        <Metric label="Costo" value={`$${formula.preparation_cost ?? 0}`} />
        <Metric label="Stock" value={String(inventory?.stock_quantity ?? 0)} />
      </View>
      <Text style={styles.recipeSummary}>Receta v{formula.recipe?.version || '1.0'} · {formula.recipe?.ingredients?.length || 0} ingrediente(s) · Actualizado {inventory?.last_update || 'N/A'}</Text>
      <View style={styles.actions}>
        <Pressable onPress={() => onEdit(formula)}><Text style={styles.editAction}>Editar</Text></Pressable>
        <Pressable onPress={() => onStatusChange(formula)}><Text style={formula.status ? styles.deleteAction : styles.restoreAction}>{formula.status ? 'Desactivar' : 'Restaurar'}</Text></Pressable>
      </View>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <View style={styles.metric}><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue} numberOfLines={1}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, safe: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: Spacing.three, paddingBottom: 120, gap: Spacing.three, maxWidth: 800, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: Spacing.two, paddingRight: 68 }, headerTextWrap: { flex: 1, minWidth: 0 },
  eyebrow: { color: '#0F766E', fontFamily: Fonts.mono, fontSize: 12, letterSpacing: 1.5 }, title: { color: '#0F172A', fontFamily: Fonts.serif, fontSize: 30, fontWeight: '700', marginTop: 4 }, subtitle: { color: '#64748B', fontSize: 14, marginTop: 6 },
  countBadge: { backgroundColor: '#CCFBF1', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center' }, count: { color: '#115E59', fontSize: 22, fontWeight: '800' }, countLabel: { color: '#0F766E', fontSize: 11 },
  formCard: { backgroundColor: '#fff', padding: Spacing.three, gap: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  formHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, sectionTitle: { color: '#0F172A', fontSize: 18, fontWeight: '800' }, subsection: { color: '#0F172A', fontSize: 15, fontWeight: '800', marginTop: 6 }, cancel: { color: '#0F766E', fontWeight: '700' },
  row: { flexDirection: 'row', gap: 12 }, field: { flex: 1, gap: 6 },
  label: { color: '#475569', fontSize: 12, fontWeight: '700' },
  input: { backgroundColor: '#F8FAFC', borderColor: '#CBD5E1', borderWidth: 1, borderRadius: 8, color: '#0F172A', fontSize: 15, paddingHorizontal: 12, paddingVertical: 10, minHeight: 44 },
  picker: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, pickerText: { color: '#0F172A', flex: 1 }, placeholder: { color: '#94A3B8', padding: 12 },
  searchInput: { backgroundColor: '#F8FAFC', borderColor: '#CBD5E1', borderWidth: 1, borderRadius: 8, color: '#0F172A', padding: 10, margin: 8 },
  dropdown: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, overflow: 'hidden', zIndex: 999, elevation: 20 },
  dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }, dropdownText: { color: '#334155' }, dropdownName: { color: '#334155', fontWeight: '700' }, dropdownSub: { color: '#94A3B8', fontSize: 11, marginTop: 3 },
  ingredientBox: { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0', borderWidth: 1, borderRadius: 8, padding: 12, gap: 8 },
  autoInfo: { backgroundColor: '#F0FDF4', borderRadius: 8, padding: 10 }, autoText: { color: '#166534', fontSize: 12 },
  primaryButton: { alignItems: 'center', backgroundColor: '#0F766E', borderRadius: 8, minHeight: 46, justifyContent: 'center' }, primaryText: { color: '#fff', fontWeight: '800' },
  secondaryButton: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#F1F5F9', borderRadius: 6, borderWidth: 1, borderColor: '#CBD5E1' }, secondaryText: { color: '#0F766E', fontWeight: '700', fontSize: 12 },
  listHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, switchRow: { flexDirection: 'row', alignItems: 'center', gap: 6 }, switchLabel: { color: '#64748B', fontSize: 12 },
  errorBox: { backgroundColor: '#FFF1F2', borderColor: '#FECDD3', borderWidth: 1, borderRadius: 10, padding: Spacing.three, gap: 6 }, errorTitle: { color: '#9F1239', fontWeight: '800' }, errorText: { color: '#881337' }, connectionText: { color: '#9F1239', fontFamily: Fonts.mono, fontSize: 11 }, retry: { color: '#0F766E', fontWeight: '800' },
  empty: { color: '#64748B', textAlign: 'center', padding: Spacing.four },
  itemCard: { backgroundColor: '#fff', borderColor: '#E2E8F0', borderWidth: 1, borderRadius: 12, padding: Spacing.three, gap: 10 }, inactiveCard: { opacity: 0.78 }, itemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }, itemId: { color: '#0F766E', fontFamily: Fonts.mono, fontSize: 12 }, itemName: { color: '#0F172A', fontSize: 18, fontWeight: '800' }, statusPill: { borderRadius: 99, paddingHorizontal: 9, paddingVertical: 5, fontSize: 11, fontWeight: '800' }, itemDescription: { color: '#64748B', fontSize: 13 }, metrics: { flexDirection: 'row', gap: 8 }, metric: { backgroundColor: '#F8FAFC', borderRadius: 8, flex: 1, padding: 9 }, metricLabel: { color: '#64748B', fontSize: 10 }, metricValue: { color: '#0F172A', fontSize: 12, fontWeight: '800', marginTop: 3 }, recipeSummary: { color: '#475569', fontSize: 12 }, actions: { borderTopColor: '#E2E8F0', borderTopWidth: 1, flexDirection: 'row', gap: 18, paddingTop: 10 }, editAction: { color: '#0F766E', fontWeight: '800' }, deleteAction: { color: '#BE123C', fontWeight: '800' }, restoreAction: { color: '#15803D', fontWeight: '800' },
});
