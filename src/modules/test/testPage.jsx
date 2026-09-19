import { useState } from "react";
import { Home } from "lucide-react";

import EjemploIcon from "../../assets/Tesoreria/notificaciones.svg";

import Header from "../../components/layout/header";
import ModuleLayout from "../../components/layout/ModuleLayout";
import Sidebar from "../../components/layout/Sidebar";
import SearchBar from "../../components/shared/searchBar";
import DataTable from "../../components/shared/DataTable";
import ActionButtons from "../../components/shared/ActionButtons";
import Modal from "../../components/shared/Modal";
import Alert from "../../components/shared/Alert";
import { useAuth } from "../../api/AuthContext";

const libros = [
  { id_libro: 1, nombre: "Matemáticas 6", autor: "Santillana", disponible: true },
  { id_libro: 2, nombre: "Lenguaje 7", autor: "Norma", disponible: false },
  { id_libro: 3, nombre: "Ciencias 8", autor: "SM", disponible: true },
];

export default function TestPage() {
  const { user, logout } = useAuth();

  const [selectedMenu, setSelectedMenu] = useState("Inventario Libros");
  const [fila, setFila]                 = useState(null);
  const [modal, setModal]               = useState(false);
  const [formValues, setFormValues]     = useState({});
  const [alert, setAlert]               = useState({ isOpen: false, type: "", title: "", message: "" });

  const menuItems = [
    { label: "Inicio", icon: <Home /> },
    { label: "Ejemplo de boton", icon: EjemploIcon },
  ];

  const showAlert = (type, message, title = "") =>
    setAlert({ isOpen: true, type, message, title });

  const closeAlert = () =>
    setAlert((prev) => ({ ...prev, isOpen: false }));

  return (
    <div className="dashboard-container">

      <Header title="ESTO ES UNA PRUEBA BBCITA" />

      <ModuleLayout
        sidebar={
          <Sidebar
            menuItems={menuItems}
            selectedMenu={selectedMenu}
            setSelectedMenu={setSelectedMenu}
            user={user?.nombre || "Usuario"}
            logout={logout}
          />
        }
        actions={
          <ActionButtons
            filaSeleccionada={fila}
            botones={[
              { label: "Agregar Libro",  onClick: () => { setFormValues({}); setModal(true); }, siempreActivo: true, variante: "primary" },
              { label: "Editar Libro",   onClick: (f) => { setFormValues(f); setModal(true); },                     variante: "secondary" },
              { label: "Eliminar Libro", onClick: (f) => console.log("eliminar", f),                               variante: "danger" },
            ]}
          />
        }
      >
        <SearchBar
          fields={[
            { key: "documento", label: "Código",          type: "text" },
            { key: "nombre",    label: "Título del Libro", type: "text" },
            { key: "edicion",   label: "Edición",         type: "text" },
          ]}
          onSearch={(f) => console.log(f)}
        />

        <div style={{ display: "flex", gap: "10px", padding: "10px" }}>
          <button onClick={() => showAlert("success", "Libro asignado correctamente.")}>Probar éxito</button>
          <button onClick={() => showAlert("error",   "No se pudo guardar.", "Error")}>Probar error</button>
          <button onClick={() => showAlert("warning", "El estudiante ya tiene préstamo.", "Atención")}>Probar advertencia</button>
          <button onClick={() => showAlert("info",    "Solo se muestran libros disponibles.", "Información")}>Probar info</button>
          <button onClick={() => setAlert({isOpen: true,type: "warning",title: "¿Estás seguro?",message: "Esta acción eliminará el registro permanentemente.",hasCancel: true,})}>Probar cancelar</button>
        </div>

        <DataTable
          columns={[
            { key: "id_libro", label: "ID" },
            { key: "nombre",   label: "Título del Libro" },
            { key: "autor",    label: "Autor" },
            { key: "disponible", label: "Disponibilidad",
              render: (val) => (
                <span className={val ? "badge--ok" : "badge--no"}>
                  {val ? "Disponible" : "No disponible"}
                </span>
              ),
            },
          ]}
          rows={libros}
          onRowClick={(f) => setFila(f)}
        />
      </ModuleLayout>

      {/* Modal — solo cuando está abierto */}
      {modal && (
        <Modal
          title={formValues.id_libro ? "Editar Libro" : "Agregar Libro"}
          onClose={() => setModal(false)}
          onSave={(data) => { console.log("Guardar", data); setModal(false); }}
        >
          <div>Formulario para {formValues.id_libro ? "editar" : "nuevo"} libro</div>
        </Modal>
      )}

      {/* Alert — siempre montado, se muestra/oculta con isOpen */}
      <Alert {...alert} onClose={closeAlert} onCancel={alert.hasCancel ? closeAlert : undefined}/>


    </div>
  );
}