import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import "./inventarioLibros.css";
import { useAuth } from "../../api/AuthContext";

import {
  getLibrosRequest,
  getPrestamosRequest,
  createLibroRequest,
  updateLibroRequest,
  deleteLibroRequest,
  allsalonesRequest,
  asignarLibroRequest,
  devolverLibroRequest,
} from "../../api/endpointsSalon";
import Alert from "../../components/shared/Alert";
import { allaniosacademicosRequest } from "../../api/endpoints";
import { Icon } from '@mdi/react';
import {
  mdiHome,
  mdiChairSchool,
  mdiBookOpenPageVariant,
  mdiBookshelf,
  mdiClipboardTextOutline,
} from '@mdi/js';

import Header         from "../../components/layout/header";
import ModuleLayout  from "../../components/layout/ModuleLayout";
import Sidebar       from "../../components/layout/Sidebar";
import SearchBar     from "../../components/shared/searchBar";
import DataTable     from "../../components/shared/DataTable";
import ActionButtons from "../../components/shared/ActionButtons";
import Modal         from "../../components/shared/Modal";

export default function BibliotecaPage() {
  const location = useLocation();
  const { user, roles, loadingRoles, logout } = useAuth();

  const [pestanaActiva, setPestanaActiva]       = useState("prestamos");
  const [selectedMenu, setSelectedMenu]         = useState("Biblioteca");
  const [filaSeleccionada, setFilaSeleccionada] = useState(null);

  const [modal, setModal]                 = useState(false);
  const [modalTipo, setModalTipo]         = useState("agregar");
  const [formValues, setFormValues]       = useState({});
  const [modalEliminar, setModalEliminar] = useState(false);
  const userName = user?.nombre || "Usuario";
  const rol = roles[0] || (loadingRoles ? "Cargando rol..." : "Sin rol");

  const [prestamoIdActivo, setPrestamoIdActivo] = useState(null);

  const [loading, setLoading]                     = useState(true);
  const [error, setError]                         = useState(null);
  const [libros, setLibros]                       = useState([]);
  const [librosFiltered, setLibrosFiltered]       = useState([]);
  const [prestamos, setPrestamos]                 = useState([]);
  const [prestamosFiltered, setPrestamosFiltered] = useState([]);
  const [salones, setSalones]                     = useState([]);
  const [periodos, setPeriodos]                   = useState([]);
  const [alert, setAlert] = useState({ isOpen: false, type: "", title: "", message: "" });

  const [filtrosPrestamos, setFiltrosPrestamos] = useState({
    codigo: "",
    nombre: "",
    grado: "",
    grupo: "",
    periodo: ""
  });

  const salonesMap  = Object.fromEntries(salones.map((s) => [s.id_salon, s]));
  const periodosMap = Object.fromEntries(periodos.map((p) => [p.id_periodo, p]));

  const menuItems = [
    { label: "Inicio",           icon: <Icon path={mdiHome}                  size={1} />, path: "/home",                  roles: ["titular", "admin"] },
    { label: "Pupitres",         icon: <Icon path={mdiChairSchool}           size={1} />, path: "/salon/pupitre",         roles: ["titular", "admin"] },
    { label: "Biblioteca",        icon: <Icon path={mdiBookOpenPageVariant}  size={1} />, path: "/salon/biblioteca/inicio",    roles: ["titular", "admin"] },
    { label: "Inventario Libros", icon: <Icon path={mdiBookshelf}            size={1} />, path: "/salon/biblioteca/inventario", roles: ["titular", "admin"] },
    { label: "Pruebas",          icon: <Icon path={mdiClipboardTextOutline} size={1} />, path: "/salon/pruebas",              roles: ["titular", "admin"] },
  ];

  const showAlert = (type, message, title = "") =>
    setAlert({ isOpen: true, type, message, title });

  const closeAlert = () =>
    setAlert((prev) => ({ ...prev, isOpen: false }));

  useEffect(() => {
    if (location.pathname.includes("inventario")) {
      setPestanaActiva("libros");
      setSelectedMenu("Inventario Libros");
    } else {
      setPestanaActiva("prestamos");
      setSelectedMenu("Biblioteca");
    }
    setFilaSeleccionada(null);
  }, [location.pathname]);

  useEffect(() => {
    const cargarTodo = async () => {
      try {
        setLoading(true);
        setError(null);
        await Promise.all([
          cargarPrestamos(),
          cargarLibros(),
          cargarSalones(),
          cargarPeriodos(),
        ]);
      } catch (err) {
        console.error(err);
        setError("Error al comunicar con el servidor.");
      } finally {
        setLoading(false);
      }
    };
    cargarTodo();
  }, []);

  const cargarPrestamos = async () => {
    try {
      const { data } = await getPrestamosRequest();
      const formateados = Array.isArray(data)
        ? data.map((p) => {
            const devuelto = p.estado === "Devuelto" || p.estado === true || p.estado === "true";
            return {
              id:            p.id_prestamo,
              id_prestamo:   p.id_prestamo,
              codigo:        p.codigo  ?? "",
              nombre:        p.nombre  ?? "",
              grado:         p.grado   ?? "",
              grupo:         p.grupo   ?? "",
              titulo_libro:  p.libro   ?? "",
              fecha_entrega: p.fecha_entrega ?? p.fecha_devolucion ?? "",
              estado: devuelto ? "Devuelto" : "Prestado",
              estado_fisico: p.estado_fisico ?? "Excelente",
              edicion:       p.edicion ?? ""
            };
          })
        : [];
      setPrestamos(formateados);
      setPrestamosFiltered(formateados);
    } catch (err) {
      console.error("ERROR PRESTAMOS:", err);
    }
  };

  const cargarLibros = async () => {
    try {
      const { data } = await getLibrosRequest();
      const formateados = Array.isArray(data)
        ? data
            .filter((l) => !l.nombre?.includes("(Eliminado del Inventario)"))
            .map((l) => ({
              id:            l.id_libro,
              nombre:        l.nombre       ?? "",
              autor:         l.autor        ?? "",
              edicion:       l.edicion      ?? "",
              disponible:    l.disponible ? "Disponible" : "Prestado",
              estado_fisico: l.estado_fisico ?? "Excelente",
            }))
        : [];
      setLibros(formateados);
      setLibrosFiltered(formateados);
    } catch (err) {
      console.error("ERROR LIBROS:", err);
    }
  };

  const cargarSalones = async () => {
    try {
      const { data } = await allsalonesRequest();
      setSalones(data ?? []);
    } catch (err) {
      console.error("Error cargando salones:", err);
    }
  };

  const cargarPeriodos = async () => {
    try {
      const { data } = await allaniosacademicosRequest();
      const lista = data ?? [];
      setPeriodos(lista);
      setFiltrosPrestamos(prev => ({ ...prev, periodo: lista[0]?.nombre || "" }));
    } catch (err) {
      console.error("Error cargando periodos:", err);
    }
  };

  const abrirModalAsignar = () => {
    setModalTipo("asignar");
    setFormValues({
      codigo:           "",
      nombre:           "",
      titulo_libro:     "",
      edicion:          "",
      fecha_entrega:    "",
      estado_del_libro: "", 
    });
    setModal(true);
  };

  const abrirModalDevolver = () => {
    if (!filaSeleccionada) {
      showAlert("warning", "Por favor, selecciona un registro de préstamo en la tabla primero.");
      return;
    }
    if (filaSeleccionada.estado === "Devuelto") {
      showAlert("warning", "Este libro ya figura como devuelto en el sistema.");
      return;
    }
    const id = filaSeleccionada.id_prestamo ?? filaSeleccionada.id;
    if (!id) {
      showAlert("error", "La fila seleccionada no contiene un ID válido.");
      return;
    }
    setPrestamoIdActivo(id);
    setModalTipo("devolver");
    setFormValues({
      titulo_libro:         filaSeleccionada.titulo_libro,
      edicion:              filaSeleccionada.edicion || "Única",
      fecha_entrega:        filaSeleccionada.fecha_entrega,
      estado_original:      filaSeleccionada.estado_fisico || "Excelente",
      fecha_devolucion:     new Date().toISOString().split("T")[0],
      estado_de_devolucion: "",
      observacion:          "",
    });
    setModal(true);
  };

  const abrirModalAgregar = () => {
    setModalTipo("agregar");
    setFormValues({
      nombre:        "",
      autor:         "",
      edicion:       "",
      grado:         "",
      grupo:         "",
      disponible:    "Disponible",
      estado_fisico: "",
    });
    setModal(true);
  };

  const abrirModalEditar = () => {
    if (!filaSeleccionada) { showAlert("warning", "Debes seleccionar un libro."); return; }
    setModalTipo("editar");
    setFormValues(filaSeleccionada);
    setModal(true);
  };

  const cerrarModal = () => {
    setModal(false);
    setFormValues({});
    setPrestamoIdActivo(null);
  };

// ✅ Correcto
const handleGuardarTodo = async () => {
  if (modalTipo === "agregar" || modalTipo === "editar") {
    if (!formValues.nombre?.trim() || !formValues.autor?.trim() || !formValues.edicion?.trim() || !formValues.estado_fisico) {
      showAlert("error", "Todos los campos requeridos deben estar diligenciados.");
      return;
    }
    if (modalTipo === "agregar" && (!formValues.grado || !formValues.grupo)) {
      showAlert("error", "Debes seleccionar el grado y grupo del salón.");
      return;
    }
  }  // ← esta llave faltaba

  if (modalTipo === "asignar") {
    if (!formValues.codigo?.trim() || !formValues.titulo_libro || !formValues.fecha_entrega || !formValues.edicion || !formValues.estado_del_libro) {
      showAlert("error", "Información incompleta. Por favor valide los campos requeridos.");
      return;
    }
  }

  if (modalTipo === "devolver") {
    if (!formValues.fecha_devolucion || !formValues.estado_de_devolucion) {
      showAlert("error", "Complete la información obligatoria de la devolución.");
      return;
    }
  }

  try {
    if (modalTipo === "agregar") {
      const salon = Object.values(salonesMap).find(
        (s) => s.grado?.toString() === formValues.grado?.toString() &&
               s.grupo?.toString() === formValues.grupo?.toString()
      );
      await createLibroRequest({
        nombre:        formValues.nombre,
        autor:         formValues.autor,
        edicion:       formValues.edicion,
        id_salon:      salon?.id_salon ?? null,
        disponible:    true,
        estado_fisico: formValues.estado_fisico,
      });
    } else if (modalTipo === "editar") {
      await updateLibroRequest(formValues.id, {
        nombre:        formValues.nombre,
        autor:         formValues.autor,
        edicion:       formValues.edicion,
        estado_fisico: formValues.estado_fisico,
      });
    } else if (modalTipo === "asignar") {
      await asignarLibroRequest({
        codigo:           formValues.codigo.trim(),
        libro:            formValues.titulo_libro,
        fecha_devolucion: formValues.fecha_entrega,
        edicion:          formValues.edicion,
        estado:           "Prestado",
        estado_fisico:    formValues.estado_del_libro,
      });
    } else if (modalTipo === "devolver") {
      await devolverLibroRequest(prestamoIdActivo, {
        fecha_devolucion:     formValues.fecha_devolucion,
        estado_de_devolucion: formValues.estado_de_devolucion,
        observacion:          formValues.observacion ?? "",
      });
    }

    await cargarPrestamos();
    await cargarLibros();
    cerrarModal();
    setFilaSeleccionada(null);
  } catch (err) {
    showAlert("error", "Ocurrió un error al guardar los datos.");
  }
};

  const handleEliminarLibro = () => {
    if (!filaSeleccionada) { showAlert("error", "Selecciona un libro primero."); return; }
    if (filaSeleccionada.disponible === "Prestado") { showAlert("warning", "No es posible eliminar un libro con préstamo activo."); return; }
    setModalEliminar(true);
  };

  const confirmarEliminarLibro = async () => {
    try {
      await deleteLibroRequest(filaSeleccionada.id);
      await cargarLibros();
      await cargarPrestamos();
      setFilaSeleccionada(null);
      setModalEliminar(false);
    } catch (err) {
      showAlert("error", "Error en el servidor al intentar eliminar el libro.");
    }
  };

  const filtrarPrestamos = (f) => {
    let filtered = prestamos;
    if (f.codigo)  filtered = filtered.filter((r) => r.codigo?.toString().includes(f.codigo));
    if (f.nombre)  filtered = filtered.filter((r) => r.nombre?.toLowerCase().includes(f.nombre.toLowerCase()));
    if (f.grado)   filtered = filtered.filter((r) => r.grado?.toString() === f.grado.toString());
    if (f.grupo)   filtered = filtered.filter((r) => r.grupo?.toString() === f.grupo.toString());
    if (f.periodo) {
      filtered = filtered.filter((r) => {
        const salon = Object.values(salonesMap).find(
          (s) => s.grado?.toString() === r.grado?.toString() && s.grupo?.toString() === r.grupo?.toString()
        );
        return periodosMap[salon?.id_periodo]?.nombre?.toString() === f.periodo.toString();
      });
    }
    setPrestamosFiltered(filtered);
  };

  const filtrarLibros = (filtros) => {
    let f = libros;
    if (filtros.nombre)  f = f.filter((l) => l.nombre?.toLowerCase().includes(filtros.nombre.toLowerCase()));
    if (filtros.autor)   f = f.filter((l) => l.autor?.toLowerCase().includes(filtros.autor.toLowerCase()));
    if (filtros.edicion) f = f.filter((l) => l.edicion?.toString().includes(filtros.edicion));
    setLibrosFiltered(f);
  };

  const columnasInicio = [
    { key: "codigo",        label: "CÓDIGO",
      render: (value) => <span style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 400 }}>{value}</span>}, 
    { key: "nombre",        label: "NOMBRE COMPLETO" },
    { key: "grado",         label: "GRADO" },
    { key: "grupo",         label: "GRUPO" },
    { key: "titulo_libro",  label: "TÍTULO DEL LIBRO" },
    { key: "fecha_entrega", label: "FECHA DE ENTREGA",
      render: (value) => <span style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 400 }}>{value}</span>},
    {
      key: "estado", label: "ESTADO",
      render: (val) => (
        <span className={val === "Prestado" ? "badge--no" : "badge--ok"}>{val}</span>
      ),
    },
  ];

  const columnasLibros = [
    { key: "id",            label: "CÓDIGO" },
    { key: "nombre",        label: "TÍTULO DEL LIBRO" },
    { key: "autor",         label: "AUTOR" },
    { key: "edicion",       label: "EDICIÓN" },
    {
      key: "disponible", label: "DISPONIBILIDAD",
      render: (val) => (
        <span className={val === "Disponible" ? "badge--ok" : "badge--no"}>{val}</span>
      ),
    },
    {
      key: "estado_fisico", label: "ESTADO FÍSICO",
      render: (val) => {
        const clase = val === "Excelente" ? "badge--ok" : val === "Regular" ? "badge--warning" : "badge--no";
        return <span className={clase}>{val}</span>;
      },
    },
  ];

  const configModal = {
    agregar: {
    titulo: "AGREGAR LIBRO",
    campos: [
      { key: "nombre",        label: "Título del Libro", type: "text" },
      { key: "autor",         label: "Autor",            type: "text" },
      { key: "edicion",       label: "Edición",          type: "text" },
      {
        key: "grado",
        label: "Grado",
        type: "select",
        placeholder: "Seleccionar",
        options: [...new Set(Object.values(salonesMap).map((s) => s.grado).filter(Boolean))],
      },
      {
        key: "grupo",
        label: "Grupo",
        type: "select",
        placeholder: "Seleccionar",
        disabled: !formValues.grado,
        options: formValues.grado
          ? [...new Set(
              Object.values(salonesMap)
                .filter((s) => s.grado?.toString() === formValues.grado?.toString())
                .map((s) => s.grupo)
                .filter(Boolean)
            )]
          : [],
      },
      { key: "estado_fisico", label: "Estado Físico", type: "select", placeholder: "Seleccionar", options: ["Excelente", "Regular", "Malo"] },
    ],
  },
    editar: {
      titulo: "EDITAR LIBRO",
      campos: [
        { key: "nombre",        label: "Título del Libro", type: "text" },
        { key: "autor",         label: "Autor",            type: "text" },
        { key: "edicion",       label: "Edición",          type: "text" },
        { key: "estado_fisico", label: "Estado Físico",    type: "select", options: ["Excelente", "Regular", "Malo"] },
      ],
    },
    asignar: {
      titulo: "ASIGNAR LIBRO",
      campos: [
        { key: "codigo",       label: "Código Estudiante", type: "text" },
        { key: "nombre",       label: "Nombre Completo",   type: "text", disabled: true },
        {
          key: "titulo_libro",
          label: "Título del Libro",
          type: "select",
          placeholder: "Seleccionar",
          options: libros.filter((l) => l.disponible === "Disponible").map((l) => ({ value: l.nombre, label: l.nombre })),
        },
        {
          key: "edicion",
          label: "Edición",
          type: "select",
          placeholder: "Seleccionar",
          disabled: !formValues.titulo_libro,
          options: libros.filter((l) => l.nombre === formValues.titulo_libro).map((l) => ({ value: l.edicion, label: l.edicion })),
        },
        { key: "fecha_entrega",    label: "Fecha de Entrega", type: "date" },
        { key: "estado_del_libro", label: "Estado del Libro", type: "select", placeholder: "Seleccionar", options: ["Excelente", "Regular", "Malo"] },
      ],
    },
    devolver: {
      titulo: "DEVOLVER LIBRO",
      campos: [
        { key: "titulo_libro",         label: "Título del Libro",     type: "text",   disabled: true },
        { key: "edicion",              label: "Edición",              type: "text",   disabled: true },
        { key: "fecha_entrega",        label: "Fecha de Entrega",     type: "text",   disabled: true },
        { key: "estado_original",      label: "Estado de Entrega",    type: "text",   disabled: true },
        { key: "fecha_devolucion",     label: "Fecha de Devolución",  type: "date" },
        { key: "estado_de_devolucion", label: "Estado de Devolución", type: "select", placeholder: "Seleccionar", options: ["Excelente", "Regular", "Malo"] },
        { key: "observacion",          label: "Observación",          type: "text" },
      ],
    },
  };

  const { titulo: tituloModal, campos: camposModal } = configModal[modalTipo] ?? { titulo: "", campos: [] };

  return (
    <div>
      <Header title="SISTEMA DE PAZ Y SALVO - NEW CAMBRIDGE SCHOOL" />

      <ModuleLayout
        sidebar={
          <Sidebar
            menuItems={menuItems}
            selectedMenu={selectedMenu}
            setSelectedMenu={setSelectedMenu}
            user={{ nombre: userName, rol: rol }}
            loadingRoles={loadingRoles}
            logout={logout}
          />
        }
        actions={
          <ActionButtons
            filaSeleccionada={filaSeleccionada}
            botones={
              pestanaActiva === "prestamos"
                ? [
                    { label: "Asignar Libro",  onClick: abrirModalAsignar,  siempreActivo: true,        variante: "primary" },
                    { label: "Devolver Libro", onClick: abrirModalDevolver, disabled: !filaSeleccionada, variante: "primary" },
                  ]
                : [
                    { label: "Agregar Libro",  onClick: abrirModalAgregar,   siempreActivo: true, variante: "primary" },
                    { label: "Editar   \u00A0      Libro\u00A0",   onClick: abrirModalEditar,   disabled: !filaSeleccionada || filaSeleccionada.disponible === "Prestado", variante: "primary" },
                    { label: "Eliminar Libro", onClick: handleEliminarLibro, disabled: !filaSeleccionada || filaSeleccionada.disponible === "Prestado", variante: "primary" },
                  ]
            }
          />
        }
      >
        {pestanaActiva === "prestamos" && (
          <div>
            <SearchBar
              loading={loading}
              key={periodos[0]?.nombre || "loading"} 
              fields={[
                { key: "codigo", label: "Código", type: "number", maxLength: 10 },
                { key: "nombre", label: "Nombre", type: "text" },
                {
                  key: "grado", label: "Grado", type: "select",
                  options: [...new Set(Object.values(salonesMap).map((s) => s.grado).filter(Boolean))],
                },
                {
                  key: "grupo", label: "Grupo", type: "select",
                  options: filtrosPrestamos.grado
                    ? [...new Set(
                        Object.values(salonesMap)
                          .filter(s => s.grado?.toString() === filtrosPrestamos.grado)
                          .map(s => s.grupo).filter(Boolean)
                      )]
                    : [],
                },
                {
                  key: "periodo", label: "Período", type: "select",
                  options: [...new Set(Object.values(periodosMap).map((p) => p.nombre).filter(Boolean))],
                },
              ]}
              initialValues={{ periodo: periodos[0]?.nombre }}
              onChange={(key, value) => {
                setFiltrosPrestamos(prev => {
                  const nuevos = { ...prev, [key]: value };
                  if (key === "grado") nuevos.grupo = "";
                  if (key === "periodo") {
                    nuevos.grado = "";
                    nuevos.grupo = "";
                  }
                  return nuevos;
                });
              }}
              onSearch={(f) => {
                filtrarPrestamos(f);
                setFiltrosPrestamos(f);
                setFilaSeleccionada(null);
              }}
              cleanFilter={{ codigo: "", nombre: "", grado: "", grupo: "", periodo: filtrosPrestamos.periodo }}
            />

            <div style={{ marginTop: "1rem", background: "#fff", borderRadius: ".8rem", overflow: "hidden", border: "1px solid #D9D9D9" }}>
              <DataTable
                columns={columnasInicio}
                rows={prestamosFiltered}
                emptyText="No hay préstamos"
                onRowClick={setFilaSeleccionada}
                pageSize={10}
              />
            </div>
          </div>
        )}

        {pestanaActiva === "libros" && (
          <div>
            <div className="searchbar-inventario">
              <SearchBar
                loading={loading}
                fields={[
                  { key: "nombre",  label: "Título del Libro", type: "text" },
                  { key: "autor",   label: "Autor",            type: "text" },
                  { key: "edicion", label: "Edición",          type: "text" },
                ]}
                onSearch={filtrarLibros}
                cleanFilter={{ nombre: "", autor: "", edicion: "" }}
              />
            </div>
            <div style={{ marginTop: "1rem", background: "#fff", borderRadius: ".8rem", overflow: "hidden", border: "1px solid #D9D9D9" }}>
              <DataTable
                columns={columnasLibros}
                rows={librosFiltered}
                emptyText="No hay libros"
                onRowClick={setFilaSeleccionada}
                pageSize={10}
              />
            </div>
          </div>
        )}
      </ModuleLayout>

      <Alert {...alert} onClose={closeAlert} />

      <Modal
        title={tituloModal}
        isOpen={modal}
        fields={camposModal}
        values={formValues}
        onChange={(key, val) => {
          if (key === "codigo") {
            val = val.replace(/\D/g, "").slice(0, 10);
          }

          setFormValues((prev) => ({
            ...prev,
            [key]: val,
            ...(key === "grado" ? { grupo: "" } : {}),
          }));
        }}
        onAccept={handleGuardarTodo}
        onCancel={cerrarModal}
      />

      <Modal
        title="ELIMINAR LIBRO"
        isOpen={modalEliminar}
        fields={[
          {
            type: "label",
            className: "confirm-delete",
            label: `¿Confirmas que deseas eliminar el libro "${filaSeleccionada?.nombre}" de ${filaSeleccionada?.autor}? Esta acción no puede deshacerse.`,
          },
        ]}
        values={{}}
        onChange={() => {}}
        onAccept={confirmarEliminarLibro}
        onCancel={() => setModalEliminar(false)}
      />
    </div>
  );
}
