import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { classService } from '../../../services/classService';
import { subjectService } from '../../../services/subjectService';
import { Class } from '../../../types/class';
import { Subject } from '../../../types/subject';

export function ClassesListPage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');

  // Subject modal state
  const [modalClass, setModalClass] = useState<Class | null>(null);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [_assignedIds, setAssignedIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [modalLoading, setModalLoading] = useState(false);
  const [modalSaving, setModalSaving] = useState(false);

  // Subject chips per class
  const [classSubjects, setClassSubjects] = useState<Record<string, Subject[]>>({});

  const fetchClasses = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await classService.getAll(page, 20, search || undefined);
      setClasses(response.data);

      if (response.meta) {
        setTotalPages(response.meta.totalPages);
      }

      // Fetch subjects for each class in parallel
      const classesData = response.data;
      const subjectMap: Record<string, Subject[]> = {};
      await Promise.all(
        classesData.map(async (cls) => {
          try {
            const res = await classService.getClassSubjects(cls.id);
            subjectMap[cls.id] = res.data;
          } catch {
            subjectMap[cls.id] = [];
          }
        })
      );
      setClassSubjects(subjectMap);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load classes');
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete class "${name}"? This action cannot be undone.`)) return;
    try {
      await classService.remove(id);
      fetchClasses();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete class');
    }
  };

  const openSubjectModal = async (cls: Class) => {
    setModalClass(cls);
    setModalLoading(true);
    setError(null);
    try {
      const [subjectsRes, assignedRes] = await Promise.all([
        subjectService.getAll(1, 100),
        classService.getClassSubjects(cls.id),
      ]);
      setAllSubjects(subjectsRes.data.filter(s => s.isActive));
      const assigned = new Set(assignedRes.data.map(s => s.id));
      setAssignedIds(assigned);
      setSelectedIds(new Set(assigned));
    } catch (err: any) {
      setError('Failed to load subjects');
    } finally {
      setModalLoading(false);
    }
  };

  const closeSubjectModal = () => {
    setModalClass(null);
    setAllSubjects([]);
    setAssignedIds(new Set());
    setSelectedIds(new Set());
  };

  const toggleSubject = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const saveSubjectAssignment = async () => {
    if (!modalClass) return;
    setModalSaving(true);
    setError(null);
    try {
      await classService.assignSubjects(modalClass.id, Array.from(selectedIds));
      closeSubjectModal();
      fetchClasses();
      // Refresh subjects for this class
      const res = await classService.getClassSubjects(modalClass.id);
      setClassSubjects(prev => ({ ...prev, [modalClass.id]: res.data }));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to assign subjects');
    } finally {
      setModalSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Classes</h1>
          <p className="mt-1 text-sm text-gray-500">Manage all classes in your school</p>
        </div>
        <Link to="/classes/new" className="btn-primary">
          + Add Class
        </Link>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="card">
        <div className="p-4 border-b border-gray-200">
          <input
            type="text"
            placeholder="Search by name or level..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input max-w-md"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Name</th>
                <th className="table-header">Level</th>
                <th className="table-header">Class Teacher</th>
                <th className="table-header">Capacity</th>
                <th className="table-header">Students</th>
                <th className="table-header">Subjects</th>
                <th className="table-header">Status</th>
                <th className="table-header text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    Loading classes...
                  </td>
                </tr>
              ) : classes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No classes found. Click "+ Add Class" to create one.
                  </td>
                </tr>
              ) : (
                classes.map((cls) => (
                  <tr key={cls.id} className="hover:bg-gray-50">
                    <td className="table-cell font-medium text-gray-900">{cls.name}</td>
                    <td className="table-cell">Level {cls.level}</td>
                    <td className="table-cell">
                      {cls.classTeacher
                        ? `${cls.classTeacher.firstName} ${cls.classTeacher.lastName}`
                        : '—'}
                    </td>
                    <td className="table-cell">{cls.capacity ?? '—'}</td>
                    <td className="table-cell">{cls._count?.enrollments ?? 0}</td>
                    <td className="table-cell">
                      <button
                        onClick={() => openSubjectModal(cls)}
                        className="text-sm text-primary-600 hover:text-primary-800 underline"
                      >
                        Manage Subjects
                      </button>
                      {(() => {
                        const subjects = classSubjects[cls.id];
                        if (!subjects || subjects.length === 0) {
                          return <span className="ml-2 text-xs text-gray-400">No subjects assigned</span>;
                        }
                        const visible = subjects.slice(0, 4);
                        const remaining = subjects.length - 4;
                        return (
                          <span className="ml-2 inline-flex flex-wrap gap-1">
                            {visible.map((s) => (
                              <span
                                key={s.id}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                {s.name}
                              </span>
                            ))}
                            {remaining > 0 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                +{remaining} more
                              </span>
                            )}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="table-cell">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        cls.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {cls.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="table-cell text-right space-x-2">
                      <Link
                        to={`/classes/${cls.id}/edit`}
                        className="text-sm text-primary-600 hover:text-primary-800"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(cls.id, cls.name)}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn-secondary disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Subject Assignment Modal */}
      {modalClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Subjects — {modalClass.name}
              </h3>
              <button onClick={closeSubjectModal} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {modalLoading ? (
                <p className="text-gray-500 text-center py-8">Loading subjects...</p>
              ) : allSubjects.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No subjects available. Create subjects first.</p>
              ) : (
                <div className="space-y-2">
                  {allSubjects.map((s) => (
                    <label key={s.id} className="flex items-center space-x-3 p-2 rounded hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(s.id)}
                        onChange={() => toggleSubject(s.id)}
                        className="h-4 w-4 text-primary-600 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">{s.name}</span>
                      <span className="text-xs text-gray-400">({s.code})</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center justify-end space-x-3 p-4 border-t border-gray-200">
              <button onClick={closeSubjectModal} className="btn-secondary">Cancel</button>
              <button
                onClick={saveSubjectAssignment}
                disabled={modalSaving}
                className="btn-primary disabled:opacity-50"
              >
                {modalSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}