import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Plus, Trash2, Search, Edit, Folder, X } from 'lucide-react';

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const initialFormState = { name: '', slug: '', description: '' };
  const [formData, setFormData] = useState(initialFormState);

  // --- 1. FETCH DATA ---
  useEffect(() => {
    fetchData();
    const subscription = supabase.channel('public:categories')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => fetchData())
      .subscribe();
    return () => supabase.removeChannel(subscription);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      setCurrentUser(session.user);
      const { data } = await supabase.from('categories').select('*').order('created_at', { ascending: false });
      if (data) setCategories(data);
    }
    setLoading(false);
  };

  // --- 2. AUTO-GENERATE SLUG ---
  // When typing the category name, this auto-fills a clean slug (e.g., "New Tech" -> "new-tech")
  const handleNameChange = (e) => {
    const newName = e.target.value;
    const autoSlug = newName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    setFormData({ ...formData, name: newName, slug: autoSlug });
  };

  // --- 3. ACTIONS ---
  const openModal = (categoryToEdit = null) => {
    if (categoryToEdit) {
      setEditingId(categoryToEdit.id);
      setFormData(categoryToEdit);
    } else {
      setEditingId(null);
      setFormData(initialFormState);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const categoryData = {
      user_id: currentUser.id,
      name: formData.name,
      slug: formData.slug,
      description: formData.description
    };

    if (editingId) {
      await supabase.from('categories').update(categoryData).eq('id', editingId);
    } else {
      await supabase.from('categories').insert([categoryData]);
    }

    setIsModalOpen(false);
    setFormData(initialFormState);
    fetchData();
  };

  const deleteCategory = async (id) => {
    if (window.confirm("Are you sure you want to delete this category? Products using this category will still keep their tag.")) {
      await supabase.from('categories').delete().eq('id', id);
      fetchData();
    }
  };

  // --- 4. FILTERING ---
  const filteredCategories = categories.filter(category => 
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    category.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="font-sans text-slate-800 pb-12 w-full max-w-[1200px] mx-auto h-full">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-6 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-normal text-slate-800 tracking-wide">Product Categories</h1>
        </div>
        <div>
          <button onClick={() => openModal()} className="flex items-center gap-2 px-4 py-2 bg-[#1774b5] text-white border border-[#1774b5] rounded-none shadow-none text-sm hover:bg-[#135d90] transition-colors">
            <Plus size={14} /> Add Category
          </button>
        </div>
      </div>

      {/* DATA TABLE (Flat UI) */}
      <div className="bg-white border border-slate-300 rounded-none shadow-none overflow-hidden">
        
        {/* Search Bar */}
        <div className="p-3 border-b border-slate-200 bg-slate-50">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Search categories..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-white border border-slate-300 rounded-none text-sm focus:outline-none focus:border-[#1774b5]" 
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-300 text-xs font-normal text-slate-500 uppercase tracking-wide">
                <th className="py-3 px-4 border-r border-slate-200 w-1/3">Category Name</th>
                <th className="py-3 px-4 border-r border-slate-200 w-1/4">URL Slug</th>
                <th className="py-3 px-4 border-r border-slate-200">Description</th>
                <th className="py-3 px-4 text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {loading ? (
                <tr><td colSpan="4" className="p-6 text-center text-slate-400 font-light">Loading categories...</td></tr>
              ) : filteredCategories.length === 0 ? (
                <tr><td colSpan="4" className="p-6 text-center text-slate-400 font-light">No categories found.</td></tr>
              ) : (
                filteredCategories.map((category) => (
                  <tr key={category.id} className="hover:bg-slate-50 transition-colors">
                    
                    <td className="py-3 px-4 border-r border-slate-200">
                      <div className="flex items-center gap-3">
                        <Folder size={16} className="text-[#1774b5]" />
                        <span className="font-medium text-slate-800">{category.name}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 border-r border-slate-200">
                      <span className="bg-slate-100 border border-slate-300 px-2 py-0.5 text-xs text-slate-600 font-mono">
                        {category.slug}
                      </span>
                    </td>

                    <td className="py-3 px-4 border-r border-slate-200 text-slate-600 truncate max-w-xs">
                      {category.description || <span className="text-slate-400 italic">No description</span>}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <button onClick={() => openModal(category)} className="text-slate-400 hover:text-amber-600 transition-colors" title="Edit">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => deleteCategory(category.id)} className="text-slate-400 hover:text-red-600 transition-colors" title="Delete">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- ADD/EDIT MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-center items-center p-4">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setIsModalOpen(false)}></div>
          
          <div className="relative bg-white w-full max-w-lg max-h-[90vh] rounded-none shadow-none border border-slate-400 flex flex-col overflow-hidden">
            
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
              <h2 className="text-lg font-normal text-slate-800">{editingId ? 'Edit Category' : 'Add New Category'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-slate-800"><X size={18}/></button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              <form id="categoryForm" onSubmit={handleSubmit} className="space-y-5">
                
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Category Name *</label>
                  <input 
                    required 
                    type="text" 
                    value={formData.name} 
                    onChange={handleNameChange} 
                    className="w-full bg-white border border-slate-300 p-2 text-sm rounded-none outline-none focus:border-[#1774b5]" 
                    placeholder="e.g. Home Decor"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-600 mb-1">URL Slug *</label>
                  <input 
                    required 
                    type="text" 
                    value={formData.slug} 
                    onChange={e => setFormData({...formData, slug: e.target.value})} 
                    className="w-full bg-slate-50 border border-slate-300 p-2 text-sm rounded-none outline-none focus:border-[#1774b5] font-mono" 
                  />
                  <p className="text-[10px] text-slate-400 mt-1">This is auto-generated for URLs. Use lowercase and hyphens only.</p>
                </div>

                <div>
                  <label className="block text-xs text-slate-600 mb-1">Description (Optional)</label>
                  <textarea 
                    rows="3" 
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})} 
                    className="w-full bg-white border border-slate-300 p-2 text-sm rounded-none outline-none focus:border-[#1774b5] resize-none" 
                    placeholder="Brief description of this category..."
                  />
                </div>

              </form>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 shrink-0">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 rounded-none">Cancel</button>
              <button type="submit" form="categoryForm" className="px-6 py-2 bg-[#1774b5] text-white text-sm border border-[#1774b5] hover:bg-[#135d90] rounded-none">
                {editingId ? 'Save Changes' : 'Create Category'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;