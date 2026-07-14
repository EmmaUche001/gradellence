import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { teacherService } from '../../../services/teacherService';
import { classService } from '../../../services/classService';
import { Teacher } from '../../../types/teacher';
import { Class } from '../../../types/class';
import { Subject } from '../../../types/subject';

export function TeachersListPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');

  // Assignment modal state
  const [modalTeacher, setModalTeacher] = useState<Teacher | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [classSubjects, setClassSubjects] = useState<Subject[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<Set<string>>(new Set());
  const [assignments, setAssignments] = useState<any[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [assigningClassTeacher, setAssigningClassTeacher] = useState(false);
  const [subjectsLoading, setSubjectsLoading] = useState(false);

  const fetchTeachers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await teacherService.getAll(page, 20, search || undefined);
      setTeachers(response.data);
      if (response.meta) {
        setTotalPages(response.meta.totalPages);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load teachers');
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete teacher "${name}"? This action cannot be undone.`)) return;
    try {
      await teacherService.remove(id);
      fetchTeachers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete teacher');
    }
  };

  const fetchClassSubjects = async (classId: string) => {
    if (!classId) {
      setClassSubjects([]);
      return;
    }
    setSubjectsLoading(true);
    try {
      const res = await classService.getClassSubjects(classId);
      setClassSubjects(res.data);
    } catch {
      setClassSubjects([]);
    } finally {
      setSubjectsLoading(false);
    }
  };

  const openAssignmentModal = async (teacher: Teacher) => {
    setModalTeacher(teacher);
    setModalLoading(true);
    setError(null);
    setSelectedClassId('');
    setSelectedSubjectIds(new Set());
    setClassSubjects([]);
    try {
      const [classesRes, assignmentsRes] = await Promise.all([
        classService.getAll(1, 100),
        teacherService.getAssignments(teacher.id),
      ]);
      setClasses(classesRes.data.filter(c => c.isActive));
      setAssignments(assignmentsRes.data || []);
    } catch (err: any) {
      setError('Failed to load data');
    } finally {
      setModalLoading(false);
    }
  };

  const closeAssignmentModal = () => {
    setModalTeacher(null);
    setClasses([]);
    setClassSubjects([]);
    setAssignments([]);
    setSelectedSubjectIds(new Set());
  };

  const toggleSubjectSelection = (id: string) => {
    setSelectedSubjectIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAssign = async () => {
    if (!modalTeacher || !selectedClassId || selectedSubjectIds.size === 0) return;
    setAssigning(true);
    setError(null);
    try {
      const promises = Array.from(selectedSubjectIds).map(subjectId =>
        teacherService.assignSubject({
          teacherId: modalTeacher.id,
          subjectId,
          classId: selectedClassId,
        })
      );
      await Promise.all(promises);
      // Refresh assignments
      const res = await teacherService.getAssignments(modalTeacher.id);
      setAssignments(res.data || []);
      setSelectedClassId('');
      setSelectedSubjectIds(new Set());
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to assign subjects');
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveAssignment = async (subjectId: string, classId: string) => {
    if (!modalTeacher) return;
    try {
      await teacherService.removeSubjectAssignment(modalTeacher.id, subjectId, classId);
      const res = await teacherService.getAssignments(modalTeacher.id);
      setAssignments(res.data || []);
    } catch (err: any) {
      setError('Failed to remove assignment');
    }
  };

  const handleAssignAsClassTeacher = async () => {
    if (!modalTeacher || !selectedClassId) return;
    setAssigningClassTeacher(true);
    setError(null);
    try {
      await teacherService.assignAsClassTeacher(modalTeacher.id, selectedClassId);
      setSelectedClassId('');
      // Refresh assignments list
      const resAssignments = await teacherService.getAssignments(modalTeacher.id);
      setAssignments(resAssignments.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to assign class teacher');
    } finally {
      setAssigningClassTeacher(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teachers</h1>
          <p className="mt-1 text-sm text-gray-500">Manage all teachers in your school</p>
        </div>
        <Link to="/teachers/new" className="btn-primary">
          + Add Teacher
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
            placeholder="Search by name, employee ID, or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input max-w-md"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Employee ID</th>
                <th className="table-header">First Name</th>
                <th className="table-header">Last Name</th>
                <th className="table-header">Qualification</th>
                <th className="table-header">Status</th>
                <th className="table-header text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Loading teachers...
                  </td>
                </tr>
              ) : teachers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No teachers found. Click "+ Add Teacher" to create one.
                  </td>
                </tr>
              ) : (
                teachers.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-gray-50">
                    <td className="table-cell font-medium text-gray-900">
                      {teacher.employeeId}
                    </td>
                    <td className="table-cell">{teacher.firstName}</td>
                    <td className="table-cell">{teacher.lastName}</td>
                    <td className="table-cell">{teacher.qualification || '—'}</td>
                    <td className="table-cell">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        teacher.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {teacher.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="table-cell text-right space-x-2">
                      <button
                        onClick={() => openAssignmentModal(teacher)}
                        className="text-sm text-primary-600 hover:text-primary-800"
                      >
                        Assignments
                      </button>
                      <Link
                        to={`/teachers/${teacher.id}/edit`}
                        className="text-sm text-primary-600 hover:text-primary-800"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(teacher.id, `${teacher.firstName} ${teacher.lastName}`)}
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

      {/* Assignment Modal */}
      {modalTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Assignments — {modalTeacher.firstName} {modalTeacher.lastName}
              </h3>
              <button onClick={closeAssignmentModal} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              {modalLoading ? (
                <p className="text-gray-500 text-center py-8">Loading...</p>
              ) : (
                <>
                  {/* Tab 1: Assign as Class Teacher */}
                  <div className="space-y-3 pb-4 border-b border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-700">Assign as Class Teacher</h4>
                    <div>
                      <label className="text-xs text-gray-500">Class</label>
                      <select
                        className="input text-sm"
                        value={selectedClassId}
                        onChange={(e) => setSelectedClassId(e.target.value)}
                      >
                        <option value="">Select class</option>
                        {classes.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={handleAssignAsClassTeacher}
                      disabled={assigningClassTeacher || !selectedClassId}
                      className="btn-primary text-sm disabled:opacity-50"
                    >
                      {assigningClassTeacher ? 'Assigning...' : 'Assign as Class Teacher'}
                    </button>
                    <p className="text-xs text-gray-500">
                      This will set the teacher as the class teacher and auto-assign all current class subjects.
                    </p>
                  </div>

                  {/* Tab 2: Assign Subject (Multi-select) */}
                  <div className="space-y-3 pb-4 border-b border-gray-200 pt-4">
                    <h4 className="text-sm font-semibold text-gray-700">Assign Subject</h4>
                    <div>
                      <label className="text-xs text-gray-500">Class</label>
                      <select
                        className="input text-sm"
                        value={selectedClassId}
                        onChange={(e) => { setSelectedClassId(e.target.value); setSelectedSubjectIds(new Set()); fetchClassSubjects(e.target.value); }}
                      >
                        <option value="">Select class</option>
                        {classes.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    {selectedClassId && (
                      <div>
                        <label className="text-xs text-gray-500">Subjects (select one or more)</label>
                        <div className="mt-1 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-2 space-y-1">
                          {subjectsLoading ? (
                            <p className="text-xs text-gray-400 py-2 text-center">Loading subjects...</p>
                          ) : classSubjects.length === 0 ? (
                            <p className="text-xs text-gray-400 py-2 text-center">No subjects assigned to this class yet. Assign subjects to the class first.</p>
                          ) : (
                            classSubjects.map((s) => (
                              <label key={s.id} className="flex items-center space-x-2 p-1.5 rounded hover:bg-gray-50 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selectedSubjectIds.has(s.id)}
                                  onChange={() => toggleSubjectSelection(s.id)}
                                  className="h-4 w-4 text-primary-600 rounded"
                                />
                                <span className="text-sm text-gray-700">{s.name}</span>
                                <span className="text-xs text-gray-400">({s.code})</span>
                              </label>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                    {!selectedClassId && (
                      <p className="text-xs text-gray-400 py-2">Select a class first to see available subjects</p>
                    )}
                    <button
                      onClick={handleAssign}
                      disabled={assigning || !selectedClassId || selectedSubjectIds.size === 0}
                      className="btn-primary text-sm disabled:opacity-50"
                    >
                      {assigning ? 'Assigning...' : `Assign Subject${selectedSubjectIds.size > 0 ? ` (${selectedSubjectIds.size})` : ''}`}
                    </button>
                  </div>

                  {/* Existing assignments */}
                  <div className="pt-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Current Assignments</h4>
                    {assignments.length === 0 ? (
                      <p className="text-sm text-gray-500">No assignments yet.</p>
                    ) : (
                      <ul className="space-y-2">
                        {assignments.map((a: any, i: number) => (
                          <li key={i} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                            <span>
                              <strong>{a.subject?.name || 'Subject'}</strong>
                              {' — '}
                              {a.class?.name || 'Class'}
                            </span>
                            <button
                              onClick={() => handleRemoveAssignment(a.subjectId, a.classId)}
                              className="text-red-600 hover:text-red-800 text-xs"
                            >
                              Remove
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-end p-4 border-t border-gray-200">
              <button onClick={closeAssignmentModal} className="btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}