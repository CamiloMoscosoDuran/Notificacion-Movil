// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable,
  RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { API_BASE_URL } from '../../constants/config';
import { clientService } from '../../services/client.service';
import { notificationService } from '../../services/notification.service';
import type { Client, ClientPayload } from '../../types/client.types';
import { validateClient } from '../../utils/validators';
import { Fonts, Spacing } from '../constants/theme';

const DOCUMENT_TYPES = ['DNI', 'RUC', 'CE'];

const SETTLEMENT_TYPES = [
  'Caserío', 'Comunidad campesina', 'Fundo', 'Hacienda', 'Campamento',
  'Anexo', 'Sector', 'Urbanización', 'Asentamiento humano', 'Asociación', 'Condominio',
];
const STREET_TYPES = [
  'Carretera', 'Trocha', 'Camino', 'Pasaje', 'Avenida', 'Jirón', 'Calle', 'Óvalo', 'Plaza',
];

const emptyClient = (): ClientPayload => ({
  firstName: '', lastName: '', documentType: 'DNI', documentNumber: '',
  phone: '', email: '', registrationDate: new Date().toISOString().slice(0, 10),
  farmName: '', hectareas: '', typeCrop: '',
  department: '', province: '', district: '',
  settlementType: '', settlementName: '',
  streetType: '', streetName: '', reference: '',
});

function fieldsOf(client: Client) {
  const firstName = client.first_name || client.firstName || '';
  const lastName = client.last_name || client.lastName || '';
  const farmPlot = Array.isArray(client.farm_plot) ? client.farm_plot[0] : client.farm_plot;
  const addressSpecifics = client.address?.especifics;
  return {
    firstName, lastName,
    documentType: client.document_type || client.documentType || 'DNI',
    documentNumber: client.document_number || client.documentNumber || '',
    phone: Array.isArray(client.phone) ? client.phone.join(', ') : client.phone || '',
    email: client.email || '',
    registrationDate: client.registration_date || client.registrationDate || '',
    active: client.status !== false,
    farmName: farmPlot?.farm_name || '',
    hectareas: String(farmPlot?.hectareas || ''),
    typeCrop: farmPlot?.type_crop || '',
    department: client.address?.department || '',
    province: client.address?.province || '',
    district: client.address?.district || '',
    settlementType: addressSpecifics?.settlement_type || client.address?.settlement_type || '',
    settlementName: addressSpecifics?.settlement_name || client.address?.settlement_name || '',
    streetType: addressSpecifics?.street_type || client.address?.street_type || '',
    streetName: addressSpecifics?.street_name || client.address?.street_name || '',
    reference: addressSpecifics?.reference || client.address?.reference || '',
  };
}

export default function ClientScreen() {
  const [clients, setClients] = useState<Client[]>([]);
  const [form, setForm] = useState<ClientPayload>(emptyClient());
  const scrollRef = useRef<ScrollView>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [showDocTypes, setShowDocTypes] = useState(false);
  const [showSettlementPicker, setShowSettlementPicker] = useState(false);
  const [showStreetPicker, setShowStreetPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    setError('');
    try { setClients(await clientService.listAll()); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'No se pudo conectar.'); }
    finally { setLoading(false); setRefreshing(false); }
  };
  useEffect(() => { const run = async () => { await load(); }; void run(); }, []);

  const visibleClients = useMemo(() => clients.filter((c) => showInactive || fieldsOf(c).active), [clients, showInactive]);

  const updateField = (field: keyof ClientPayload, value: string) => setForm((c) => ({ ...c, [field]: value }));

  const startEditing = (client: Client) => {
    const v = fieldsOf(client);
    setEditingId(client.id);
    setForm({
      id: client.id, firstName: v.firstName, lastName: v.lastName,
      documentType: v.documentType, documentNumber: v.documentNumber,
      phone: v.phone, email: v.email,
      registrationDate: v.registrationDate || new Date().toISOString().slice(0, 10),
      status: client.status,
      farmName: v.farmName, hectareas: v.hectareas, typeCrop: v.typeCrop,
      department: v.department, province: v.province, district: v.district,
      settlementType: v.settlementType, settlementName: v.settlementName,
      streetType: v.streetType, streetName: v.streetName, reference: v.reference,
    });
    setShowDocTypes(false); setShowSettlementPicker(false); setShowStreetPicker(false);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };
  const resetForm = () => { setEditingId(null); setForm(emptyClient()); setShowDocTypes(false); setShowSettlementPicker(false); setShowStreetPicker(false); };

  const save = async () => {
    const validationError = validateClient(form);
    if (validationError) { showMessage('Revisa el formulario', validationError); return; }
    setSaving(true);
    const clientName = `${form.firstName} ${form.lastName}`.trim();
    const isEditing = Boolean(editingId);
    try {
      if (editingId) await clientService.update(editingId, form);
      else await clientService.create(form);
      resetForm();
      await load(true);
      void notificationService.notifyActionSuccess(
        isEditing ? 'actualizado' : 'registrado',
        'Cliente',
        clientName,
      );
    } catch (requestError) {
      showMessage('No se pudo guardar', requestError instanceof Error ? requestError.message : 'Error inesperado.');
    } finally { setSaving(false); }
  };

  const changeStatus = async (client: Client) => {
    try {
      if (fieldsOf(client).active) await clientService.remove(client.id);
      else await clientService.restore(client.id);
      await load(true);
    } catch (requestError) {
      showMessage('No se pudo actualizar el estado', requestError instanceof Error ? requestError.message : 'Error inesperado.');
    }
  };
  const confirmStatus = (client: Client) => {
    const active = fieldsOf(client).active;
    const action = active ? 'desactivar' : 'restaurar';
    if (Platform.OS === 'web') { if (window.confirm(`¿Quieres ${action} a ${fieldsOf(client).firstName}?`)) void changeStatus(client); }
    else Alert.alert(active ? 'Desactivar cliente' : 'Restaurar cliente', `¿Quieres ${action} este cliente?`,
      [{ text: 'Cancelar', style: 'cancel' }, { text: active ? 'Desactivar' : 'Restaurar', onPress: () => void changeStatus(client) }]);
  };
  function showMessage(title: string, message: string) { if (Platform.OS === 'web') window.alert(`${title}\n\n${message}`); else Alert.alert(title, message); }

  const docHint = form.documentType === 'DNI' ? '8 dígitos' : form.documentType === 'RUC' ? '11 dígitos' : form.documentType === 'CE' ? '9 dígitos' : 'solo números';

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTextWrap}>
              <Text style={styles.eyebrow}>AGROTECNO</Text>
              <Text style={styles.title}>Directorio de Clientes</Text>
              <Text style={styles.subtitle}>Gestiona el registro y contacto de tus clientes.</Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.count}>{clients.filter((c) => fieldsOf(c).active).length}</Text>
              <Text style={styles.countLabel}>activos</Text>
            </View>
          </View>

          {/* Formulario */}
          <View style={styles.formCard}>
            <View style={styles.formHeading}>
              <Text style={styles.sectionTitle}>{editingId ? 'Editar cliente' : 'Nuevo cliente'}</Text>
              {editingId && <Pressable onPress={resetForm}><Text style={styles.cancel}>Cancelar</Text></Pressable>}
            </View>

            {/* ── Datos personales ── */}
            <Text style={styles.subsection}>Datos personales</Text>
            <View style={styles.row}>
              <Field label="Nombre * (mín. 3, solo letras)" value={form.firstName} placeholder="Juan" onChangeText={(v) => updateField('firstName', v)} />
              <Field label="Apellidos * (mín. 3, solo letras)" value={form.lastName} placeholder="Pérez" onChangeText={(v) => updateField('lastName', v)} />
            </View>

            {/* Tipo de documento */}
            <View style={[styles.field, { zIndex: 500 }]}>
              <Text style={styles.label}>Tipo de documento *</Text>
              <Pressable style={[styles.input, styles.picker]} onPress={() => { setShowDocTypes((c) => !c); setShowSettlementPicker(false); setShowStreetPicker(false); }}>
                <Text style={styles.pickerText}>{form.documentType}</Text>
                <Text>▼</Text>
              </Pressable>
              {showDocTypes && (
                <View style={styles.dropdown}>
                  {DOCUMENT_TYPES.map((type) => (
                    <Pressable key={type} style={styles.dropdownItem} onPress={() => { updateField('documentType', type); updateField('documentNumber', ''); setShowDocTypes(false); }}>
                      <Text style={styles.dropdownText}>{type}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            <Field label={`Número de documento * (${docHint})`} value={form.documentNumber} placeholder={docHint} onChangeText={(v) => updateField('documentNumber', v)} keyboardType="numeric" />
            <Field label="Teléfono * (9 dígitos)" value={typeof form.phone === 'string' ? form.phone : Array.isArray(form.phone) ? form.phone.join(', ') : ''} placeholder="999888777" onChangeText={(v) => updateField('phone', v)} keyboardType="phone-pad" />
            <Field label="Correo electrónico * (mín. 10 car., con @)" value={form.email} placeholder="cliente@correo.com" onChangeText={(v) => updateField('email', v)} keyboardType="email-address" autoCapitalize="none" />

            <View style={styles.autoInfo}>
              <Text style={styles.autoText}>📅 Fecha de registro: {form.registrationDate} (automática)</Text>
            </View>

            {/* ── Predio ── */}
            <Text style={styles.subsection}>Predio</Text>
            <Field label="Nombre del predio * (mín. 3, solo letras)" value={form.farmName} placeholder="La Esperanza" onChangeText={(v) => updateField('farmName', v)} />
            <View style={styles.row}>
              <Field label="Hectáreas * (> 0)" value={form.hectareas} placeholder="5.5" onChangeText={(v) => updateField('hectareas', v)} keyboardType="decimal-pad" />
              <Field label="Tipo de cultivo * (mín. 10 car.)" value={form.typeCrop} placeholder="Cultivo de maíz amarillo" onChangeText={(v) => updateField('typeCrop', v)} />
            </View>

            {/* ── Dirección ── */}
            <Text style={styles.subsection}>Dirección</Text>
            <View style={styles.row}>
              <Field label="Departamento * (mín. 3, letras)" value={form.department} placeholder="Lima" onChangeText={(v) => updateField('department', v)} />
              <Field label="Provincia * (mín. 3, letras)" value={form.province} placeholder="Lima" onChangeText={(v) => updateField('province', v)} />
            </View>
            <Field label="Distrito * (mín. 3, letras)" value={form.district} placeholder="Miraflores" onChangeText={(v) => updateField('district', v)} />

            {/* Tipo de asentamiento */}
            <View style={[styles.field, { zIndex: 400 }]}>
              <Text style={styles.label}>Tipo de asentamiento *</Text>
              <Pressable style={[styles.input, styles.picker]} onPress={() => { setShowSettlementPicker((c) => !c); setShowDocTypes(false); setShowStreetPicker(false); }}>
                <Text style={form.settlementType ? styles.pickerText : styles.placeholder}>{form.settlementType || 'Seleccionar...'}</Text>
                <Text>▼</Text>
              </Pressable>
              {showSettlementPicker && (
                <View style={styles.dropdown}>
                  {SETTLEMENT_TYPES.map((type) => (
                    <Pressable key={type} style={styles.dropdownItem} onPress={() => { updateField('settlementType', type); setShowSettlementPicker(false); }}>
                      <Text style={styles.dropdownText}>{type}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            <Field label="Nombre del asentamiento * (mín. 5 car.)" value={form.settlementName} placeholder="El Porvenir" onChangeText={(v) => updateField('settlementName', v)} />

            {/* Tipo de vía */}
            <View style={[styles.field, { zIndex: 300 }]}>
              <Text style={styles.label}>Tipo de vía *</Text>
              <Pressable style={[styles.input, styles.picker]} onPress={() => { setShowStreetPicker((c) => !c); setShowDocTypes(false); setShowSettlementPicker(false); }}>
                <Text style={form.streetType ? styles.pickerText : styles.placeholder}>{form.streetType || 'Seleccionar...'}</Text>
                <Text>▼</Text>
              </Pressable>
              {showStreetPicker && (
                <View style={styles.dropdown}>
                  {STREET_TYPES.map((type) => (
                    <Pressable key={type} style={styles.dropdownItem} onPress={() => { updateField('streetType', type); setShowStreetPicker(false); }}>
                      <Text style={styles.dropdownText}>{type}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            <Field label="Nombre de la vía * (mín. 5 car.)" value={form.streetName} placeholder="Los Rosales" onChangeText={(v) => updateField('streetName', v)} />
            <Field label="Referencia * (mín. 10 car.)" value={form.reference} placeholder="Cerca al parque central del distrito" onChangeText={(v) => updateField('reference', v)} />

            <Pressable style={styles.primaryButton} onPress={() => void save()} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{editingId ? 'Guardar cambios' : 'Registrar cliente'}</Text>}
            </Pressable>
          </View>

          {/* Lista */}
          <View style={styles.listHeading}>
            <Text style={styles.sectionTitle}>Clientes registrados</Text>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Ver inactivos</Text>
              <Switch value={showInactive} onValueChange={setShowInactive} trackColor={{ false: '#CBD5E1', true: '#0F766E' }} thumbColor="#fff" />
            </View>
          </View>

          {loading ? <ActivityIndicator color="#0F766E" /> : error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorTitle}>No se pudo cargar el directorio</Text>
              <Text style={styles.errorText}>{error}</Text>
              <Text style={styles.connectionText}>Backend: {API_BASE_URL}</Text>
              <Pressable onPress={() => void load()}><Text style={styles.retry}>Reintentar</Text></Pressable>
            </View>
          ) : visibleClients.length === 0 ? (
            <Text style={styles.empty}>No hay clientes para mostrar.</Text>
          ) : visibleClients.map((client) => (
            <ClientCard key={client.id} client={client} onEdit={startEditing} onStatusChange={confirmStatus} />
          ))}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...props} style={styles.input} placeholderTextColor="#94A3B8" /></View>;
}

function ClientCard({ client, onEdit, onStatusChange }: { client: Client; onEdit: (c: Client) => void; onStatusChange: (c: Client) => void }) {
  const v = fieldsOf(client);
  return (
    <View style={[styles.itemCard, !v.active && styles.inactiveCard]}>
      <View style={styles.itemTop}>
        <View>
          <Text style={styles.itemId}>{client.id}</Text>
          <Text style={styles.itemName}>{v.firstName} {v.lastName}</Text>
        </View>
        <Text style={[styles.statusPill, { color: v.active ? '#166534' : '#991B1B', backgroundColor: v.active ? '#DCFCE7' : '#FEE2E2' }]}>{v.active ? 'Activo' : 'Inactivo'}</Text>
      </View>
      <Text style={styles.itemDescription}>{v.documentType}: {v.documentNumber}</Text>
      <View style={styles.metrics}>
        <Metric label="Teléfono" value={v.phone || 'N/A'} />
        <Metric label="Email" value={v.email || 'N/A'} />
        <Metric label="Registro" value={v.registrationDate || 'N/A'} />
      </View>
      {v.farmName ? <Text style={styles.location}>Predio: {v.farmName} · {v.hectareas} ha · {v.typeCrop}</Text> : null}
      {v.department ? <Text style={styles.location}>Ubic.: {v.district}, {v.province}, {v.department}</Text> : null}
      <View style={styles.actions}>
        <Pressable onPress={() => onEdit(client)}><Text style={styles.editAction}>Editar</Text></Pressable>
        <Pressable onPress={() => onStatusChange(client)}>
          <Text style={v.active ? styles.deleteAction : styles.restoreAction}>{v.active ? 'Desactivar' : 'Restaurar'}</Text>
        </Pressable>
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
  picker: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, pickerText: { color: '#0F172A' }, placeholder: { color: '#94A3B8' },
  dropdown: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, overflow: 'hidden', elevation: 20, zIndex: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 },
  dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }, dropdownText: { color: '#334155' },
  autoInfo: { backgroundColor: '#F0FDF4', borderRadius: 8, padding: 10 }, autoText: { color: '#166534', fontSize: 12 },
  primaryButton: { alignItems: 'center', backgroundColor: '#0F766E', borderRadius: 8, minHeight: 46, justifyContent: 'center' }, primaryText: { color: '#fff', fontWeight: '800' },
  listHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, switchRow: { flexDirection: 'row', alignItems: 'center', gap: 6 }, switchLabel: { color: '#64748B', fontSize: 12 },
  errorBox: { backgroundColor: '#FFF1F2', borderColor: '#FECDD3', borderWidth: 1, borderRadius: 10, padding: Spacing.three, gap: 6 }, errorTitle: { color: '#9F1239', fontWeight: '800' }, errorText: { color: '#881337' }, connectionText: { color: '#9F1239', fontFamily: Fonts.mono, fontSize: 11 }, retry: { color: '#0F766E', fontWeight: '800' },
  empty: { color: '#64748B', textAlign: 'center', padding: Spacing.four },
  itemCard: { backgroundColor: '#fff', borderColor: '#E2E8F0', borderWidth: 1, borderRadius: 12, padding: Spacing.three, gap: 10 }, inactiveCard: { opacity: 0.78 }, itemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }, itemId: { color: '#0F766E', fontFamily: Fonts.mono, fontSize: 12 }, itemName: { color: '#0F172A', fontSize: 18, fontWeight: '800' }, statusPill: { borderRadius: 99, paddingHorizontal: 9, paddingVertical: 5, fontSize: 11, fontWeight: '800' }, itemDescription: { color: '#64748B', fontSize: 13 }, metrics: { flexDirection: 'row', gap: 8 }, metric: { backgroundColor: '#F8FAFC', borderRadius: 8, flex: 1, padding: 9 }, metricLabel: { color: '#64748B', fontSize: 10 }, metricValue: { color: '#0F172A', fontSize: 12, fontWeight: '800', marginTop: 3 }, location: { color: '#475569', fontSize: 12 }, actions: { borderTopColor: '#E2E8F0', borderTopWidth: 1, flexDirection: 'row', gap: 18, paddingTop: 10 }, editAction: { color: '#0F766E', fontWeight: '800' }, deleteAction: { color: '#BE123C', fontWeight: '800' }, restoreAction: { color: '#15803D', fontWeight: '800' },
});
