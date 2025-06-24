import { useState } from 'react';
import axios from 'axios';

export default function EditRecordForm({ record, onClose, onUpdated }) {
    const [form, setForm] = useState({ ...record });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: Number(value),
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.put(`http://localhost:5000/api/daily/${record.date}`, form, {
                headers: {
                    'x-auth-token': localStorage.getItem('auth-token'),
                },
            });
            alert('Record updated!');
            onUpdated(); // refresh parent
            onClose();   // close form
        } catch (err) {
            console.error('Update failed:', err);
            alert('Failed to update record.');
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{ border: '1px solid #ccc', padding: '1rem', marginTop: '1rem' }}>
            <h3>Edit Record: {record.date}</h3>

            {['asks', 'totalCalls', 'ncsOpenUsed', 'blrCount', 'tsrCount', 'thankYouCount', 'assuranceUsed'].map((field) => (
                <div key={field}>
                    <label>
                        {field}:{' '}
                        <input
                            type="number"
                            name={field}
                            value={form[field]}
                            onChange={handleChange}
                        />
                    </label>
                </div>
            ))}

            <button type="submit">Save</button>
            <button type="button" onClick={onClose} style={{ marginLeft: '1rem' }}>Cancel</button>
        </form>
    );
}