import { useState, useEffect } from "react";
import { useAuth } from "../../api/AuthContext";import { Home } from "lucide-react";
import {
  getPruebasRequest,
  updateEstadoPruebaRequest,
  allsalonesRequest,
  createPruebaRequest,
} from "../../api/endpointsSalon";
import { allaniosacademicosRequest } from "../../api/endpoints";
import Alert from "../../components/shared/Alert";
import PupitresIcon   from "../../assets/Salon/pupitres.svg";
import BibliotecaIcon from "../../assets/Salon/biblioteca.svg";
import { Icon } from '@mdi/react';
import {
  mdiHome,
  mdiChairSchool,
  mdiLibrary,    
  mdiClipboardTextOutline,            
} from '@mdi/js';

import Header        from "../../components/layout/header";
import ModuleLayout  from "../../components/layout/ModuleLayout";
import Sidebar       from "../../components/layout/Sidebar";
import SearchBar     from "../../components/shared/searchBar";
import DataTable     from "../../components/shared/DataTable";
import ActionButtons from "../../components/shared/ActionButtons";
import Modal         from "../../components/shared/Modal";

export default function PruebasPage() {
  const { user, roles, loadingRoles, logout } = useAuth();

  const userName = user?.nombre || "Usuario";
  const rol = roles[0] || (loadingRoles ? "Cargando rol..." : "Sin rol");

  const [fila, setFila]   = useState(null);
  const [modal, setModal] = useState(false);

  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [rows, setRows]                 = useState([]);
  const [rowsFiltered, setRowsFiltered] = useState([]);
  const [salones, setSalones]           = useState([]);
  const [periodos, setPeriodos]         = useState([]);
  const [alert, setAlert] = useState({ isOpen: false, type: "", title: "", message: "" });
  const [filtros, setFiltros] = useState({
    documento: "",
    nombre: "",
    Grado: "",
    Grupo: "",
    Periodo: ""
  });
  const showAlert = (type, message, title = "") =>
  setAlert({ isOpen: true, type, message, title });

  const closeAlert = () =>
    setAlert((prev) => ({ ...prev, isOpen: false }));

  const salonesMap  = {};
  salones.forEach((s)  => { salonesMap[s.id_salon]    = s; });
  const periodosMap = {};
  periodos.forEach((p) => { periodosMap[p.id_periodo] = p; });

 const menuItems = [
  { label: "Inicio",      icon: <Icon path={mdiHome}                    size={1} />, path: "/home", roles:["titular", "admin"] },
  { label: "Pupitres",    icon: <Icon path={mdiChairSchool}                size={1} />, path: "/salon/pupitre", roles:["titular", "admin"] },
  { label: "Biblioteca",  icon: <Icon path={mdiLibrary}  size={1} />, path: "/salon/biblioteca/inicio", roles:["titular", "admin"] },
  { label: "Pruebas",    icon: <Icon path={mdiClipboardTextOutline} size={1} />, path: "/salon/pruebas",roles: ["titular", "admin"] },
];
  const columns = [
    { key: "codigo", label: "CÓDIGO",render: (value) => <span style={{ fontFamily: 'Arial, sans-serif', fontWeight: 400 }}>{value}</span>},
    { key: "nombre", label: "NOMBRE COMPLETO" },
    {
      key: "grado", label: "GRADO",
      render: (_, row) => <span>{salonesMap[row.id_salon]?.grado || row.grado}</span>,
    },
    {
      key: "grupo", label: "GRUPO",
      render: (_, row) => <span>{salonesMap[row.id_salon]?.grupo || row.grupo}</span>,
    },
    { key: "tipo_prueba", label: "TIPO DE PRUEBA" },
    {
      key: "estado", label: "PAGO",
      render: (val) => (
        <span className={val === "visto" ? "badge--ok" : "badge--warning"}>
          {val === "visto" ? "Pagado" : "Pendiente"}
        </span>
      ),
    },
    {
      key: "fecha_pago",
      label: "FECHA DE PAGO",
      render: (val) => (
        !val || val === "" 
          ? <span style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 400 }}>---</span>
          : <span style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 400 }}>{val}</span>
      ),
    }
  ];

  const cargarPruebas = async () => {
    try {
      const response = await getPruebasRequest();
      const data = response.data || [];
      setRows(data);
      setRowsFiltered(data);
    } catch (error) {
      console.error("Error cargando pruebas:", error);
      setError(error.message);
    }
  };

  const cargarSalones = async () => {
    try {
      const response = await allsalonesRequest();
      setSalones(response.data || []);
    } catch (error) {
      console.error("Error cargando salones:", error);
    }
  };

  const cargarPeriodos = async () => {
    try {
      const response = await allaniosacademicosRequest();
      const data = response.data || [];
      setPeriodos(data);
      setFiltros(prev => ({ ...prev, Periodo: data[0]?.nombre || "" }));
    } catch (error) {
      console.error("Error cargando periodos:", error);
    }
  };

  useEffect(() => {
    const cargarTodo = async () => {
      try {
        setLoading(true);
        await Promise.all([cargarPruebas(), cargarSalones(), cargarPeriodos()]);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    cargarTodo();
  }, []);

  const FiltrarEstudiantes = (f) => {
    let filtered = rows;
    if (f.documento) filtered = filtered.filter((r) => r.codigo?.toString().includes(f.documento));
    if (f.nombre)    filtered = filtered.filter((r) => r.nombre?.toLowerCase().includes(f.nombre.toLowerCase()));
    if (f.Grado)     filtered = filtered.filter((r) => (salonesMap[r.id_salon]?.grado || r.grado)?.toString() === f.Grado.toString());
    if (f.Grupo)     filtered = filtered.filter((r) => (salonesMap[r.id_salon]?.grupo || r.grupo)?.toString() === f.Grupo.toString());
    setRowsFiltered(filtered);
  };

  const handleRowClick = (f) => setFila(f);

  const handleValidarPago = () => {
    if (!fila) { showAlert("error", "Debes seleccionar una fila"); return; }
    if (fila.estado === "visto") { showAlert("warning", `El estudiante ${fila.nombre} ya tiene pago registrado.`); return; }
    setModal(true);
  };

  const handleConfirmarPago = async () => {
    try {
      if (!fila) return;
      const nuevoEstado = "visto";
      const hoy = new Date();
      const fechaBackend = hoy.toISOString().split("T")[0];
      let fechaFinal;

      if (fila.id_prueba) {
        const response = await updateEstadoPruebaRequest(fila.id_prueba, nuevoEstado);
        fechaFinal = response.data.fecha_pago;
      } else {
        const response = await createPruebaRequest({
          id_estudiante: fila.id_estudiante,
          id_tipo_prueba: fila.id_tipo_prueba,
          estado: nuevoEstado,
          fecha_pago: fechaBackend,
        });
        fechaFinal = response.data.fecha_pago;
      }

      const actualizados = rows.map((r) =>
        r.id_estudiante === fila.id_estudiante && r.id_tipo_prueba === fila.id_tipo_prueba
          ? { ...r, estado: nuevoEstado, fecha_pago: fechaFinal }
          : r
      );
      setRows(actualizados);
      setRowsFiltered(actualizados);
      setFila(null);
      setModal(false);
      showAlert("success", `Pago de ${fila.nombre} validado correctamente`);
    } catch (error) {
      console.error("Error al validar pago:", error.response?.data || error);
      showAlert("error", error.response?.data?.detail || "Error al validar el pago");
    }
  };

  return (
    <div>
      <style>{`
        .badge--ok      { display:inline-block; padding:.4rem .8rem; background:#D4EDDA; color:#155724; border-radius:.4rem; font-weight:600; font-size:.9rem; }
        .badge--warning { display:inline-block; padding:.4rem .8rem; background:#FFF3CD; color:#856404; border-radius:.4rem; font-weight:600; font-size:.9rem; }
      `}</style>

      <Header title="SISTEMA DE PAZ Y SALVO - NEW CAMBRIDGE SCHOOL" />

      <ModuleLayout
        sidebar={
          <Sidebar
            menuItems={menuItems}
            selectedMenu="Pruebas"
            setSelectedMenu={() => {}}
            user={{ nombre: userName, rol: rol }}
            loadingRoles={loadingRoles}
            logout={logout}
          />
        }
        actions={
          <ActionButtons
            filaSeleccionada={fila}
            botones={[
              {
                label: "Validar Pago",
                onClick: handleValidarPago,
                disabled: !fila || fila?.estado === "visto",
                variante: "primary",
              },
            ]}
          />
        }
      >
        <div>
            <SearchBar
              key={periodos[0]?.nombre || "loading"} 
              fields={[
                { key: "documento", label: "Código", type: "number", maxLength: 10 },
                { key: "nombre",    label: "Nombre", type: "text" },
                {
                  key: "Grado", label: "Grado", type: "select",
                  options: Array.from(new Set(
                    Object.values(salonesMap).map((s) => s.grado).filter(Boolean)
                  )),
                },
                {
                  key: "Grupo", label: "Grupo", type: "select",
                  options: filtros.Grado
                    ? Array.from(new Set(
                        Object.values(salonesMap)
                          .filter(s => s.grado?.toString() === filtros.Grado)
                          .map(s => s.grupo).filter(Boolean)
                      ))
                    : [],
                },
                {
                  key: "Periodo", label: "Período", type: "select",
                  options: Array.from(new Set(
                    Object.values(periodosMap).map((p) => p.nombre).filter(Boolean)
                  )),
                },
              ]}
              initialValues={{ Periodo: periodos[0]?.nombre }}
              onChange={(key, value) => {
                setFiltros(prev => {
                  const nuevos = { ...prev, [key]: value };
                  if (key === "Grado") nuevos.Grupo = "";
                  if (key === "Periodo") {
                    nuevos.Grado = "";
                    nuevos.Grupo = "";
                  }
                  return nuevos;
                });
              }}
              onSearch={(f) => {
                FiltrarEstudiantes(f);
                setFiltros(f);
                setFila(null);
              }}
              cleanFilter={{ documento: "", nombre: "", Grado: "", Grupo: "", Periodo: filtros.Periodo }}
            />

          <DataTable
            columns={columns}
            rows={rowsFiltered}
            emptyText="No hay datos disponibles"
            onRowClick={handleRowClick}
            pageSize={10}
          />
        </div>
      </ModuleLayout>
      <Alert {...alert} onClose={closeAlert} />
      <Modal
        title="CONFIRMAR PAGO"
        isOpen={modal}
        fields={[
          {
            type: "label",
            className: "confirm-delete",
            label: `¿Confirmas que el estudiante ${
              fila?.nombre || "[NOMBRE]"
            } ha cumplido con el pago de la prueba?`,
          },
        ]}
        values={{}}
        onChange={() => {}}
        onAccept={handleConfirmarPago}
        onCancel={() => {
          setModal(false);
          setFila(null);
        }}
      />
    </div>
  );
}