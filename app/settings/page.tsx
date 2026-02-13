'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { BottomNavigation } from '@/components/navigation/BottomNavigation';
import MacroCalculator from '@/components/macros/MacroCalculator';
import { exportUserData, downloadExport, importUserData, ExportData } from '@/lib/export-import';
import { useToastContext } from '@/components/ui/ToastContainer';

export default function SettingsPage() {
  const { user, loading, logout, refresh } = useAuth();
  const router = useRouter();
  const toast = useToastContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [goals, setGoals] = useState({
    kcal: 2000,
    protein: 150,
    carbs: 200,
    fat: 65,
  });
  const [waterGoalMl, setWaterGoalMl] = useState(2000);
  const [pinRememberMinutes, setPinRememberMinutes] = useState(15);
  const [hasPin, setHasPin] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [settingPin, setSettingPin] = useState(false);
  const [removingPin, setRemovingPin] = useState(false);

  useEffect(() => {
    if (user) {
      setGoals(user.settings.goals);
      setWaterGoalMl((user.settings as any).waterGoalMl || 2000);
      setPinRememberMinutes(user.settings.pinRememberMinutes || 15);
      setHasPin(user.hasPin || false);
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...user.settings,
          goals,
          waterGoalMl,
          pinRememberMinutes,
        }),
      });

      if (res.ok) {
        // Refresh user data
        window.location.reload();
      } else {
        const data = await res.json();
        alert(data.error || 'Error al guardar objetivos');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    if (!user) return;

    try {
      setExporting(true);
      const data = await exportUserData(user._id);
      downloadExport(data);
      toast.success('Datos exportados correctamente');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Error al exportar datos');
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    if (!file.name.endsWith('.json')) {
      toast.error('Por favor selecciona un archivo JSON');
      return;
    }

    try {
      setImporting(true);
      const text = await file.text();
      const data: ExportData = JSON.parse(text);

      // Validate data structure
      if (!data.version || !data.exportDate) {
        toast.error('Archivo JSON inválido');
        return;
      }

      if (!confirm(
        `¿Estás seguro de que quieres importar estos datos?\n\n` +
        `- ${data.foods?.length || 0} alimentos\n` +
        `- ${data.entries?.length || 0} entradas\n` +
        `- ${data.weights?.length || 0} pesos\n` +
        `- ${data.water?.length || 0} registros de agua\n\n` +
        `Nota: Los datos existentes no se eliminarán, se añadirán a los actuales.`
      )) {
        return;
      }

      const results = await importUserData(data, user._id);
      
      toast.success(
        `Importación completada:\n` +
        `${results.foods} alimentos, ${results.entries} entradas, ` +
        `${results.weights} pesos, ${results.water} registros de agua`
      );

      if (results.errors.length > 0) {
        console.warn('Import errors:', results.errors);
        toast.warning(`${results.errors.length} errores durante la importación`);
      }

      // Refresh page to show imported data
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Error al importar datos. Verifica que el archivo JSON sea válido.');
    } finally {
      setImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSetPin = async () => {
    if (!user || !newPin || newPin !== confirmPin || newPin.length < 4) {
      toast.error('Los PINs no coinciden o son inválidos (mínimo 4 dígitos)');
      return;
    }

    try {
      setSettingPin(true);
      const res = await fetch('/api/auth/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: newPin }),
      });

      if (res.ok) {
        // Clear PIN inputs
        setNewPin('');
        setConfirmPin('');
        
        // Update local state immediately
        setHasPin(true);
        
        // Refresh user data from server
        await refresh();
        
        // Show success message
        toast.success('✓ PIN configurado correctamente. La aplicación ahora está protegida.');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Error al configurar PIN');
      }
    } catch (error) {
      console.error('Set PIN error:', error);
      toast.error('Error de conexión');
    } finally {
      setSettingPin(false);
    }
  };

  const handleRemovePin = async () => {
    if (!user) return;

    if (!confirm('¿Estás seguro de que quieres desactivar el PIN? La aplicación ya no estará protegida.')) {
      return;
    }

    try {
      setRemovingPin(true);
      const res = await fetch('/api/auth/pin', {
        method: 'DELETE',
      });

      if (res.ok) {
        // Clear localStorage
        localStorage.removeItem('pinUnlockedUntil');
        localStorage.removeItem('pinRememberMinutes');
        
        // Update local state immediately
        setHasPin(false);
        
        // Refresh user data from server
        await refresh();
        
        // Show success message
        toast.success('PIN desactivado correctamente');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Error al desactivar PIN');
      }
    } catch (error) {
      console.error('Remove PIN error:', error);
      toast.error('Error de conexión');
    } finally {
      setRemovingPin(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-900 dark:text-gray-100">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Ajustes</h1>

        {/* Macro Calculator */}
        <MacroCalculator onGoalsApplied={(newGoals) => setGoals(newGoals)} />

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6 animate-fade-in transition-smooth hover:shadow-md">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Objetivos diarios</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Calorías (kcal)</label>
              <input
                type="number"
                value={goals.kcal}
                onChange={(e) => setGoals({ ...goals, kcal: parseInt(e.target.value) })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Proteína (g)</label>
              <input
                type="number"
                value={goals.protein}
                onChange={(e) => setGoals({ ...goals, protein: parseInt(e.target.value) })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Carbohidratos (g)</label>
              <input
                type="number"
                value={goals.carbs}
                onChange={(e) => setGoals({ ...goals, carbs: parseInt(e.target.value) })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Grasa (g)</label>
              <input
                type="number"
                value={goals.fat}
                onChange={(e) => setGoals({ ...goals, fat: parseInt(e.target.value) })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6 animate-fade-in transition-smooth hover:shadow-md">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Configuración de PIN</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">
                Tiempo de recordar PIN (minutos)
              </label>
              <input
                type="number"
                min="0"
                max="1440"
                step="1"
                value={pinRememberMinutes}
                onChange={(e) => setPinRememberMinutes(parseInt(e.target.value) || 0)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Tiempo que la app permanece desbloqueada después de ingresar el PIN (0-1440 minutos, 0 = siempre pedir PIN)
              </p>
            </div>

            {hasPin ? (
              <div className="space-y-3">
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                  <p className="text-sm text-green-800 dark:text-green-200">
                    ✓ PIN habilitado
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                    Cambiar PIN
                  </label>
                  <input
                    type="password"
                    placeholder="Nuevo PIN (4-6 dígitos)"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    maxLength={6}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                  <input
                    type="password"
                    placeholder="Confirmar PIN"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value)}
                    maxLength={6}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                  <button
                    onClick={handleSetPin}
                    disabled={settingPin || !newPin || newPin !== confirmPin || newPin.length < 4}
                    className="w-full px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-50 hover:bg-indigo-700 transition-colors"
                  >
                    {settingPin ? 'Guardando...' : 'Cambiar PIN'}
                  </button>
                </div>
                <button
                  onClick={handleRemovePin}
                  disabled={removingPin}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded disabled:opacity-50 hover:bg-red-700 transition-colors"
                >
                  {removingPin ? 'Eliminando...' : 'Desactivar PIN'}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    PIN no configurado. La aplicación no está protegida con PIN.
                  </p>
                </div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                  Establecer PIN
                </label>
                <input
                  type="password"
                  placeholder="PIN (4-6 dígitos)"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  maxLength={6}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
                <input
                  type="password"
                  placeholder="Confirmar PIN"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  maxLength={6}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
                <button
                  onClick={handleSetPin}
                  disabled={settingPin || !newPin || newPin !== confirmPin || newPin.length < 4}
                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-50 hover:bg-indigo-700 transition-colors"
                >
                  {settingPin ? 'Guardando...' : 'Activar PIN'}
                </button>
              </div>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar configuración'}
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6 animate-fade-in transition-smooth hover:shadow-md">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Objetivo de agua</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">
                Objetivo diario de agua (ml)
              </label>
              <input
                type="number"
                min="500"
                max="5000"
                step="100"
                value={waterGoalMl}
                onChange={(e) => setWaterGoalMl(parseInt(e.target.value) || 2000)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Rango recomendado: 500ml - 5000ml
              </p>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6 animate-fade-in transition-smooth hover:shadow-md">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Exportar/Importar datos</h2>
          <div className="space-y-3">
            <button
              onClick={handleExport}
              disabled={exporting || !user}
              className="w-full px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50 hover:bg-green-700 transition-colors"
            >
              {exporting ? 'Exportando...' : '📥 Exportar datos (JSON)'}
            </button>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={importing || !user}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50 hover:bg-blue-700 transition-colors"
              >
                {importing ? 'Importando...' : '📤 Importar datos (JSON)'}
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Exporta todos tus datos (alimentos, entradas, pesos, agua) o importa desde un archivo JSON de respaldo.
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6 animate-fade-in transition-smooth hover:shadow-md">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Cuenta</h2>
          <div className="space-y-2">
            <p className="text-sm text-gray-900 dark:text-gray-100">
              <span className="font-medium">Email:</span> {user?.email}
            </p>
            <p className="text-sm text-gray-900 dark:text-gray-100">
              <span className="font-medium">Nombre:</span> {user?.name}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 animate-fade-in transition-smooth hover:shadow-md">
          <button
            onClick={logout}
            className="w-full px-4 py-2 bg-red-600 text-white rounded transition-smooth hover:bg-red-700 hover:shadow-lg active:scale-95"
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}
