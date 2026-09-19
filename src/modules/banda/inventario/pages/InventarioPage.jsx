import React, { useMemo } from 'react';
import useInventario from "../hooks/useInventario";
import { useAuth } from "../../../../api/AuthContext";

import Icon from '../../../../components/common/Icon';
import { mdiHome, mdiAccountMusic, mdiPiano } from '@mdi/js';
import { Home, LayoutList, ClipboardCheck } from "lucide-react";

import ModuleLayout from "../../../../components/layout/ModuleLayout";
import Sidebar from "../../../../components/layout/Sidebar";
import Header from "../../../../components/layout/header";
import DataTable from "../../../../components/shared/DataTable";
import SearchBar from "../../../../components/shared/searchBar";
import ActionButtons from "../../../../components/shared/ActionButtons";
import Alert from "../../../../components/shared/Alert";

import AgregarInstrumentoModal from "../components/modals/AgregarInstrumentoModal";
import EditarInstrumentoModal from "../components/modals/EditarInstrumentoModal";
import EliminarInstrumentoModal from '../components/modals/EliminarInstrumentoModal';

const InventarioPage = () => {
  const inventario = useInventario();
  const { user, roles } = useAuth();

  const primerRol = roles?.[0];
  const rolTexto = typeof primerRol === 'object' ? primerRol.nombre : (primerRol || "Banda");

  if (inventario.loading) return <div>Cargando...</div>;

  const menuBanda = [
    { label: "Inicio", path: "/banda", icon: <Home size={18} /> },
    { label: "Inventario", path: "/banda/inventario", icon: <Icon icon={mdiPiano} size={18} /> },
    { label: "Asignaciones", path: "/banda/prestamos", icon: <Icon icon={mdiAccountMusic} size={18} /> }
  ];

 const renderBadge = (estado, disponible) => {
    let bgVar = 'var(--color-input-bg)';
    let textVar = 'var(--color-text-muted)';
    let label = estado;

    if (estado === 'Activo' || estado === 'Disponible') {
      if (disponible) {
        bgVar = 'var(--color-success-bg)';
        textVar = 'var(--color-success-dark)';
        label = 'Disponible';
      } else {
        bgVar = 'var(--color-info-bg)';
        textVar = 'var(--color-info)';
        label = 'Asignado';
      }
    } else if (estado === 'En mantenimiento' || estado === 'Pendiente') {
      bgVar = 'var(--color-warning-bg)';
      textVar = 'var(--color-warning-dark)';
      label = estado === 'Pendiente' ? 'Pendiente' : 'Mantenimiento';
    } else if (estado === 'Inactivo') {
      bgVar = 'var(--color-danger-bg)';
      textVar = 'var(--color-danger-dark)';
      label = 'Inactivo';
    }

    return (
      <span style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        padding: "4px 12px", borderRadius: "var(--radius-full)",
        fontSize: "var(--text-xs)", fontWeight: "var(--font-bold)",
        backgroundColor: bgVar, color: textVar,
        textTransform: "uppercase", fontFamily: "var(--font-number)"
      }}>
        {label}
      </span>
    );
  };

  const columnas = [
    { key: "id_instrumento", label: "Código",
      render: (val) => <span style={{ fontFamily: 'var(--font-number)', fontWeight: 400 }}>{val}</span>
     },
    { key: "nombre", label: "Instrumento" },
    { key: "categoria_nombre", label: "Tipo de Instrumento" },
    { key: "estado", label: "Estado", render: (val, row) => renderBadge(val, row.cantidad_disponible > 0) },
    //{ key: "cantidad_total", label: "Cantidad Total" },
    { key: "cantidad_disponible", label: "Cantidad Disponible" },
  ];


  return (
    <>
    <Header title="SISTEMA DE PAZ Y SALVO - NEW CAMBRIGDE SCHOOL" />
      <ModuleLayout
        sidebar={<Sidebar selectedMenu="Inventario" menuItems={menuBanda} user={{ nombre: user?.nombre, rol: rolTexto }} logout={() => { }} />}
        actions={
          <ActionButtons
            filaSeleccionada={inventario.seleccionado}
            botones={[
              { label: "Agregar Instrumento", onClick: inventario.abrirAgregar, siempreActivo: true, variante: "primary" },
              { label: "Editar Instrumento", onClick: () => inventario.abrirEditar(inventario.seleccionado), variante: "secondary" },
              { label: "Eliminar Instrumento", onClick: inventario.abrirEliminar, variante: "secondary" },
            ]}
          />
        }
      >
        {}
        <Alert
        {...inventario.alert} 
            onClose={inventario.alert.onClose} 
            onCancel={inventario.alert.onCancel} 
          />
          <SearchBar
            fields={[
              { key: "id_instrumento", label: "Código", type: "text" },
              { key: "nombre", label: "Instrumento", type: "text" },
              { key: "id_categoria", label: "Tipo", type: "select", options: inventario.categorias?.map(c => c.nombre) || [] }
            ]}
            onSearch={(f) => {
              inventario.setFiltroId(f.id_instrumento);
              inventario.setFiltroNombre(f.nombre);
              inventario.setFiltroCategoria(f.id_categoria);
              inventario.handleBuscar();
            }}
          />
            <DataTable 
              columns={columnas} 
              rows={inventario.filtrados} 
              pageSize={10} 
              onRowClick={inventario.setSeleccionado} 
              emptyText="No hay instrumentos registrados" 
              />    
      </ModuleLayout>

      {/* MODALES */}
      <AgregarInstrumentoModal open={inventario.modalAgregar} onClose={() => inventario.setModalAgregar(false)} onSave={inventario.handleAgregar} form={inventario.form} setForm={inventario.setForm} categorias={inventario.categorias} />
      <EditarInstrumentoModal open={inventario.modalEditar} onClose={() => inventario.setModalEditar(false)} onSave={inventario.handleEditar} form={inventario.form} setForm={inventario.setForm} categorias={inventario.categorias} />
        <EliminarInstrumentoModal 
        open={inventario.modalEliminar} 
        onClose={() => inventario.setModalEliminar(false)} 
        onConfirm={inventario.handleEliminar} 
        instrumento={inventario.seleccionado} 
      />
    
    </>
  );
};

export default InventarioPage;