import React, { useState, useEffect, useCallback } from 'react';
import { superAdminApi } from '../services/superAdminApi';
import type { Plan } from '../types';

const defaultFeatures = '{\n  "customBranding": false,\n  "apiAccess": false,\n  "prioritySupport": false,\n  "analytics": false\n}';

const SubscriptionsPage: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    priceNGN: 0,
    duration: 30,
    maxStudents: 500,
    maxUsers: 50,
    maxBranches: 1,
    storageGB: 5,
    features: defaultFeatures,
    isActive: true,
  });

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await superAdminApi.getAllPlans();
      setPlans(res.data.data);
    } catch (err) {
      console.error('Failed to fetch plans:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      priceNGN: 0,
      duration: 30,
      maxStudents: 500,
      maxUsers: 50,
      maxBranches: 1,
      storageGB: 5,
      features: defaultFeatures,
      isActive: true,
    });
    setEditingPlan(null);
    setShowForm(false);
  };

  const handleSeedDefaults = async () => {
    try {
      const res = await superAdminApi.seedDefaultPlans();
      alert(res.data.message || 'Default plans created');
      fetchPlans();
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Failed to create default plans';
      console.error('Failed to seed plans:', err);
      alert(message);
    }
  };

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || '',
      priceNGN: plan.priceNGN,
      duration: plan.duration,
      maxStudents: plan.maxStudents,
      maxUsers: plan.maxUsers,
      maxBranches: plan.maxBranches,
      storageGB: plan.storageGB,
      features: JSON.stringify(plan.features, null, 2),
      isActive: plan.isActive,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        features: JSON.parse(formData.features),
      };

      if (editingPlan) {
        await superAdminApi.updatePlan(editingPlan.id, payload);
      } else {
        await superAdminApi.createPlan(payload);
      }
      resetForm();
      fetchPlans();
    } catch (err) {
      console.error('Failed to save plan:', err);
      alert('Failed to save plan. Check the form data and try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this plan?')) return;
    try {
      await superAdminApi.deletePlan(id);
      fetchPlans();
    } catch (err) {
      console.error('Failed to delete plan:', err);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscription Plans</h1>
          <p className="text-sm text-gray-500 mt-1">Manage platform subscription plans and pricing.</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          + New Plan
        </button>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {loading ? (
          <div className="col-span-full text-center py-12 text-gray-500">Loading plans...</div>
        ) : plans.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500 mb-4">No plans created yet.</p>
            <button
              onClick={handleSeedDefaults}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Initialize Default Plans
            </button>
          </div>
        ) : (
          plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-xl shadow-sm border-2 overflow-hidden ${
                plan.isActive ? 'border-green-200' : 'border-gray-200 opacity-60'
              }`}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                    plan.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {plan.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-4">
                  ₦{plan.priceNGN.toLocaleString()}
                  <span className="text-sm font-normal text-gray-500">/{plan.duration} days</span>
                </p>
                <ul className="space-y-2 text-sm text-gray-600 mb-6">
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Up to {plan.maxStudents.toLocaleString()} students
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Up to {plan.maxUsers} users
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    {plan.maxBranches} branch{plan.maxBranches > 1 ? 'es' : ''}
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    {plan.storageGB}GB storage
                  </li>
                </ul>
              </div>
              <div className="px-6 py-3 bg-gray-50 border-t flex justify-end space-x-2">
                <button
                  onClick={() => handleEdit(plan)}
                  className="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(plan.id)}
                  className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingPlan ? 'Edit Plan' : 'Create New Plan'}
                </h2>
                <button onClick={resetForm} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price (NGN) *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={formData.priceNGN}
                      onChange={(e) => setFormData({ ...formData, priceNGN: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration (days) *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Students *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={formData.maxStudents}
                      onChange={(e) => setFormData({ ...formData, maxStudents: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Users *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={formData.maxUsers}
                      onChange={(e) => setFormData({ ...formData, maxUsers: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Branches</label>
                    <input
                      type="number"
                      min={1}
                      value={formData.maxBranches}
                      onChange={(e) => setFormData({ ...formData, maxBranches: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Storage (GB)</label>
                    <input
                      type="number"
                      min={1}
                      value={formData.storageGB}
                      onChange={(e) => setFormData({ ...formData, storageGB: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Features (JSON) <span className="text-gray-400">optional</span>
                    </label>
                    <textarea
                      value={formData.features}
                      onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-indigo-500"
                      rows={4}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">Active (visible to schools)</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    {editingPlan ? 'Update Plan' : 'Create Plan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionsPage;