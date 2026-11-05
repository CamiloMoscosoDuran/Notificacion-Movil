import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { API_BASE_URL } from '../../constants/config';
import { insumoService } from '../../services/insumo.service';
import { notificationService } from '../../services/notification.service';
import { emptyInsumoForm, type Insumo, type InsumoForm } from '../../types/insumo.types';
import { validateInsumo } from '../../utils/validators';
import { Fonts, Spacing } from '../constants/theme';

const UNIT_OPTIONS = ['Litros', 'Kilos', 'Gramos', 'Toneladas'];
const CATEGORY_OPTIONS = ['Fertilizante', 'Semilla', 'Sustrato', 'Abono', 'General'];

export default function HomeScreen() {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [form, setForm] = useState<InsumoForm>(emptyInsumoForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visibleInsumos = useMemo(
    () => insumos.filter((insumo) => showInactive || insumo.status),
    [insumos, showInactive],
  );

  async function loadInsumos(refresh = false) {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setInsumos(await insumoService.list());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo conectar.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    const initialLoad = async () => { await loadInsumos(); };
    void initialLoad();
  }, []);

  function updateField(field: keyof InsumoForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function startEditing(insumo: Insumo) {
    setEditingId(insumo.id);
    setForm({
      id: insumo.id,
      name: insumo.name,
      description: insumo.description ?? '',
      category: insumo.category ?? 'General',
      currentStock: String(insumo.inventory.current_stock),
      minimumStock: String(insumo.inventory.minimum_stock),
      expirationDate: insumo.inventory.expiration_date,
      unit: insumo.unit,
      location: insumo.location,
      status: insumo.status,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm({ ...emptyInsumoForm });
    setShowCategoryPicker(false);
    setShowUnitPicker(false);
  }

  async function saveInsumo() {
    const validationError = validateInsumo(form);
    if (validationError) {
      showMessage('Revisa el formulario', validationError);
      return;
    }
    setSaving(true);
    const savedName = form.name;
    const isEditing = Boolean(editingId);
    try {
      if (editingId) await insumoService.update(form);
      else await insumoService.create(form);
      resetForm();
      await loadInsumos(true);

      // Disparo de notificación local (funciona en web y móvil)
      void notificationService.notifyActionSuccess(
        isEditing ? 'actualizado' : 'registrado',
        'Insumo',
        savedName,
      );
    } catch (requestError) {
      showMessage('No se pudo guardar', requestError instanceof Error ? requestError.message : 'Error inesperado.');
    } finally {
      setSaving(false);
    }
  }

  function confirmStatusChange(insumo: Insumo) {
    const action = insumo.status ? 'desactivar' : 'restaurar';
    if (Platform.OS === 'web') {
      if (window.confirm(`¿Quieres ${action} ${insumo.name}?`)) {
        void changeStatus(insumo);
      }
      return;
    }
    Alert.alert(
      `${action === 'desactivar' ? 'Desactivar' : 'Restaurar'} insumo`,
      `¿Quieres ${action} ${insumo.name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: action === 'desactivar' ? 'Desactivar' : 'Restaurar', onPress: () => void changeStatus(insumo) },
      ],
    );
  }

  async function changeStatus(insumo: Insumo) {
    try {
      if (insumo.status) await insumoService.remove(insumo.id);
      else await insumoService.restore(insumo.id);
      await loadInsumos(true);
    } catch (requestError) {
      showMessage('No se pudo actualizar el estado', requestError instanceof Error ? requestError.message : 'Error inesperado.');
    }
  }

  function showMessage(title: string, message: string) {
    if (Platform.OS === 'web') { window.alert(`${title}\n\n${message}`); return; }
    Alert.alert(title, message);
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadInsumos(true)} />}>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTextWrap}>
              <Text style={styles.eyebrow}>AGROTECNO</Text>
              <Text style={styles.title}>Inventario de insumos</Text>
              <Text style={styles.subtitle}>Controla existencias y fechas de caducidad.</Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.count}>{insumos.filter((i) => i.status).length}</Text>
              <Text style={styles.countLabel}>activos</Text>
            </View>
          </View>

          {/* Panel de Funcionalidad Avanzada: Notificaciones Locales */}
          <View style={styles.notifCard}>
            <View style={styles.notifHeader}>
              <Text style={styles.notifTitle}>🔔 Centro de Notificaciones Locales</Text>
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>Avanzado</Text>
              </View>
            </View>
            <Text style={styles.notifSubtitle}>
              Prueba la emisión de notificaciones en este dispositivo (compatible con Web y Móvil):
            </Text>
            <View style={styles.notifButtonsRow}>
              <Pressable
                style={({ pressed }) => [styles.notifBtn, pressed && styles.pressed]}
                onPress={() => void notificationService.sendLocalNotification(
                  '🌱 AgroTecno - Notificación Inmediata',
                  '¡Las notificaciones locales están funcionando correctamente tanto en web como en tu teléfono!',
                )}>
                <Text style={styles.notifBtnText}>🔔 Notificación Directa</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.notifBtn, styles.notifBtnSecondary, pressed && styles.pressed]}
                onPress={() => void notificationService.scheduleLocalNotification(
                  '⏱️ Recordatorio Programado - AgroTecno',
                  'Han pasado 5 segundos: recuerda verificar los insumos con stock bajo.',
                  5,
                )}>
                <Text style={styles.notifBtnSecondaryText}>⏱️ Programar (5s)</Text>
              </Pressable>
            </View>
          </View>

          {/* Formulario */}
          <View style={styles.formCard}>
            <View style={styles.formHeading}>
              <Text style={styles.sectionTitle}>{editingId ? 'Editar insumo' : 'Nuevo insumo'}</Text>
              {editingId && <Pressable onPress={resetForm}><Text style={styles.cancel}>Cancelar</Text></Pressable>}
            </View>

            <Field label="Nombre *" value={form.name} onChangeText={(v) => updateField('name', v)} placeholder="Semillas de maíz (mín. 10 car.)" />
            <Field label="Descripción *" value={form.description} onChangeText={(v) => updateField('description', v)} placeholder="Detalle del insumo (mín. 10 car.)" />

            {/* Categoría + Unidad */}
            <View style={[styles.row, { zIndex: 200 }]}>
              {/* Categoría picker */}
              <View style={[styles.field, { zIndex: 200 }]}>
                <Text style={styles.label}>Categoría</Text>
                <Pressable style={[styles.input, styles.picker]} onPress={() => { setShowCategoryPicker((c) => !c); setShowUnitPicker(false); }}>
                  <Text style={form.category ? styles.pickerText : styles.placeholder}>{form.category || 'Seleccionar...'}</Text>
                  <Text>▼</Text>
                </Pressable>
                {showCategoryPicker && (
                  <View style={styles.dropdown}>
                    {CATEGORY_OPTIONS.map((cat) => (
                      <Pressable key={cat} style={styles.dropdownItem} onPress={() => { updateField('category', cat); setShowCategoryPicker(false); }}>
                        <Text style={styles.dropdownText}>{cat}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              {/* Unidad picker */}
              <View style={[styles.field, { zIndex: 100 }]}>
                <Text style={styles.label}>Unidad *</Text>
                <Pressable style={[styles.input, styles.picker]} onPress={() => { setShowUnitPicker((c) => !c); setShowCategoryPicker(false); }}>
                  <Text style={form.unit ? styles.pickerText : styles.placeholder}>{form.unit || 'Seleccionar...'}</Text>
                  <Text>▼</Text>
                </Pressable>
                {showUnitPicker && (
                  <View style={styles.dropdown}>
                    {UNIT_OPTIONS.map((unit) => (
                      <Pressable key={unit} style={styles.dropdownItem} onPress={() => { updateField('unit', unit); setShowUnitPicker(false); }}>
                        <Text style={styles.dropdownText}>{unit}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            </View>

            {/* Stock */}
            <View style={styles.row}>
              <Field label="Stock mínimo *" value={form.minimumStock} onChangeText={(v) => updateField('minimumStock', v)} placeholder="10" keyboardType="decimal-pad" />
              <Field label="Stock actual *" value={form.currentStock} onChangeText={(v) => updateField('currentStock', v)} placeholder="100" keyboardType="decimal-pad" />
            </View>
            <Text style={styles.hint}>El stock actual debe ser ≥ stock mínimo.</Text>

            <Field label="Vencimiento * (AAAA-MM-DD)" value={form.expirationDate} onChangeText={(v) => updateField('expirationDate', v)} placeholder="2027-12-31" />
            <Field label="Ubicación * (mín. 10 car.)" value={form.location} onChangeText={(v) => updateField('location', v)} placeholder="Almacén principal sector B" />

            <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]} onPress={() => void saveInsumo()} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{editingId ? 'Guardar cambios' : 'Registrar insumo'}</Text>}
            </Pressable>
          </View>

          {/* Lista */}
          <View style={styles.listHeading}>
            <Text style={styles.sectionTitle}>Insumos registrados</Text>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Ver inactivos</Text>
              <Switch value={showInactive} onValueChange={setShowInactive} trackColor={{ false: '#CBD5E1', true: '#0F766E' }} thumbColor="#fff" />
            </View>
          </View>

          {loading
            ? <ActivityIndicator color="#0F766E" style={styles.loader} />
            : error
              ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorTitle}>No se pudo cargar el inventario</Text>
                  <Text style={styles.errorText}>{error}</Text>
                  <Text style={styles.connectionText}>Backend: {API_BASE_URL}</Text>
                  <Pressable onPress={() => void loadInsumos()}><Text style={styles.retry}>Reintentar</Text></Pressable>
                </View>
              )
              : visibleInsumos.length === 0
                ? <Text style={styles.empty}>No hay insumos para mostrar.</Text>
                : visibleInsumos.map((insumo) => (
                  <InsumoCard key={insumo.id} insumo={insumo} onEdit={startEditing} onStatusChange={confirmStatusChange} />
                ))}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput {...props} style={[styles.input, props.editable === false && styles.disabledInput]} placeholderTextColor="#94A3B8" />
    </View>
  );
}

function InsumoCard({ insumo, onEdit, onStatusChange }: { insumo: Insumo; onEdit: (i: Insumo) => void; onStatusChange: (i: Insumo) => void }) {
  const lowStock = insumo.inventory.current_stock <= insumo.inventory.minimum_stock;
  return (
    <View style={[styles.itemCard, !insumo.status && styles.inactiveCard]}>
      <View style={styles.itemTop}>
        <View style={styles.itemTitleWrap}>
          <Text style={styles.itemId}>{insumo.id}</Text>
          <Text style={styles.itemName}>{insumo.name}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: insumo.status ? '#DCFCE7' : '#FEE2E2' }]}>
          <Text style={[styles.statusText, { color: insumo.status ? '#166534' : '#991B1B' }]}>{insumo.status ? 'Activo' : 'Inactivo'}</Text>
        </View>
      </View>
      <Text style={styles.itemDescription}>{insumo.description || 'Sin descripción'}</Text>
      <Text style={styles.location}>Categoría: {insumo.category || 'General'}</Text>
      <View style={styles.metrics}>
        <Metric label="Existencia" value={`${insumo.inventory.current_stock} ${insumo.unit}`} warning={lowStock} />
        <Metric label="Mínimo" value={`${insumo.inventory.minimum_stock} ${insumo.unit}`} />
        <Metric label="Vence" value={insumo.inventory.expiration_date} />
      </View>
      <Text style={styles.location}>Ubicación: {insumo.location}</Text>

      {lowStock && (
        <Pressable
          style={({ pressed }) => [styles.stockAlertBtn, pressed && styles.pressed]}
          onPress={() => void notificationService.notifyStockAlert(
            insumo.name,
            insumo.inventory.current_stock,
            insumo.inventory.minimum_stock,
            insumo.unit,
          )}>
          <Text style={styles.stockAlertBtnText}>⚠️ Enviar notificación de stock bajo</Text>
        </Pressable>
      )}

      <View style={styles.actions}>
        <Pressable onPress={() => onEdit(insumo)}><Text style={styles.editAction}>Editar</Text></Pressable>
        <Pressable onPress={() => onStatusChange(insumo)}>
          <Text style={insumo.status ? styles.deleteAction : styles.restoreAction}>{insumo.status ? 'Desactivar' : 'Restaurar'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Metric({ label, value, warning }: { label: string; value: string; warning?: boolean }) {
  return <View style={styles.metric}><Text style={styles.metricLabel}>{label}</Text><Text style={[styles.metricValue, warning && styles.warning]}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: Spacing.three, paddingBottom: 120, gap: Spacing.three, maxWidth: 800, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Spacing.two, paddingRight: 68, gap: 10 }, headerTextWrap: { flex: 1, minWidth: 0 },
  eyebrow: { color: '#0F766E', fontFamily: Fonts.mono, fontSize: 12, letterSpacing: 1.5 }, title: { color: '#0F172A', fontFamily: Fonts.serif, fontSize: 24, fontWeight: '700', marginTop: 4, flexShrink: 1, maxWidth: 235 }, subtitle: { color: '#64748B', fontSize: 14, marginTop: 6 },
  countBadge: { backgroundColor: '#CCFBF1', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 10, alignItems: 'center', minWidth: 58, flexShrink: 0 }, count: { color: '#115E59', fontSize: 22, fontWeight: '800' }, countLabel: { color: '#0F766E', fontSize: 11 },

  // Panel de Notificaciones
  notifCard: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0', borderWidth: 1, borderRadius: 12, padding: Spacing.three, gap: 10 },
  notifHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  notifTitle: { color: '#065F46', fontSize: 15, fontWeight: '800' },
  notifBadge: { backgroundColor: '#059669', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  notifBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  notifSubtitle: { color: '#047857', fontSize: 12 },
  notifButtonsRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  notifBtn: { backgroundColor: '#0F766E', paddingVertical: 9, paddingHorizontal: 14, borderRadius: 8, alignItems: 'center', flex: 1, minWidth: 140 },
  notifBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  notifBtnSecondary: { backgroundColor: '#FFFFFF', borderColor: '#0F766E', borderWidth: 1 },
  notifBtnSecondaryText: { color: '#0F766E', fontSize: 12, fontWeight: '700' },
  stockAlertBtn: { backgroundColor: '#FEF3C7', borderColor: '#FCD34D', borderWidth: 1, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10, alignItems: 'center', marginTop: 4 },
  stockAlertBtnText: { color: '#92400E', fontSize: 12, fontWeight: '700' },

  formCard: { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderWidth: 1, borderRadius: 12, padding: Spacing.three, gap: 12 },
  formHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, sectionTitle: { color: '#0F172A', fontSize: 18, fontWeight: '800' }, cancel: { color: '#0F766E', fontWeight: '700' },
  row: { flexDirection: 'row', gap: 12 }, field: { flex: 1, gap: 6 },
  label: { color: '#475569', fontSize: 12, fontWeight: '700' },
  input: { backgroundColor: '#F8FAFC', borderColor: '#CBD5E1', borderWidth: 1, borderRadius: 8, color: '#0F172A', fontSize: 15, paddingHorizontal: 12, paddingVertical: 10, minHeight: 44 }, disabledInput: { color: '#64748B', backgroundColor: '#F1F5F9' },
  picker: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, pickerText: { color: '#0F172A' }, placeholder: { color: '#94A3B8' },
  dropdown: { position: 'absolute', top: 70, left: 0, right: 0, backgroundColor: '#FFFFFF', borderColor: '#94A3B8', borderWidth: 1, borderRadius: 8, overflow: 'hidden', elevation: 20, zIndex: 300, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
  dropdownItem: { paddingHorizontal: 12, paddingVertical: 10, borderBottomColor: '#E2E8F0', borderBottomWidth: 1, backgroundColor: '#FFFFFF' }, dropdownText: { color: '#334155', fontSize: 14 },
  hint: { color: '#64748B', fontSize: 11, marginTop: -6 },
  primaryButton: { alignItems: 'center', backgroundColor: '#0F766E', borderRadius: 8, minHeight: 46, justifyContent: 'center', marginTop: 4 }, primaryText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 }, pressed: { opacity: 0.75 },
  listHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, switchRow: { flexDirection: 'row', alignItems: 'center', gap: 6 }, switchLabel: { color: '#64748B', fontSize: 12 }, loader: { marginTop: Spacing.four },
  errorBox: { backgroundColor: '#FFF1F2', borderColor: '#FECDD3', borderWidth: 1, borderRadius: 10, padding: Spacing.three, gap: 6 }, errorTitle: { color: '#9F1239', fontWeight: '800' }, errorText: { color: '#881337', fontSize: 13 }, connectionText: { color: '#9F1239', fontFamily: Fonts.mono, fontSize: 11 }, retry: { color: '#0F766E', fontWeight: '800', marginTop: 4 }, empty: { color: '#64748B', textAlign: 'center', paddingVertical: Spacing.four },
  itemCard: { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderWidth: 1, borderRadius: 12, padding: Spacing.three, gap: 10 }, inactiveCard: { opacity: 0.78 }, itemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }, itemTitleWrap: { flex: 1, gap: 2 }, itemId: { color: '#0F766E', fontFamily: Fonts.mono, fontSize: 12, fontWeight: '700' }, itemName: { color: '#0F172A', fontSize: 18, fontWeight: '800' }, statusPill: { borderRadius: 99, paddingHorizontal: 9, paddingVertical: 5 }, statusText: { fontSize: 11, fontWeight: '800' }, itemDescription: { color: '#64748B', fontSize: 13 }, metrics: { flexDirection: 'row', gap: 8 }, metric: { backgroundColor: '#F8FAFC', borderRadius: 8, flex: 1, padding: 9 }, metricLabel: { color: '#64748B', fontSize: 10 }, metricValue: { color: '#0F172A', fontSize: 12, fontWeight: '800', marginTop: 3 }, warning: { color: '#B45309' }, location: { color: '#475569', fontSize: 12 }, actions: { borderTopColor: '#E2E8F0', borderTopWidth: 1, flexDirection: 'row', gap: 18, paddingTop: 10 }, editAction: { color: '#0F766E', fontWeight: '800' }, deleteAction: { color: '#BE123C', fontWeight: '800' }, restoreAction: { color: '#15803D', fontWeight: '800' },
});
