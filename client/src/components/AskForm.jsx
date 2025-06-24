import { useState } from 'react';
import axios from 'axios';

export default function AskForm({ onSubmit }) {
    const [form, setForm] = useState({
        asked: true,
        ncsOpenUsed: false,
        blrCount: 0,
        tsrCount: 0,
        thankYouUsed: false,
        assuranceUsed: false
    });

    const handleChange = (e) => {
        const { name, type, checked, value } = e.target;
        setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
    };

    const handleCount = (field) => {
        setForm({ ...form, [field]: form[field] + 1 });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:5000/api/ask', form, {
                headers: {
                    'x-auth-token': localStorage.getItem('auth-token'),
                },
            });
            setForm({
                asked: true,
                ncsOpenUsed: false,
                blrCount: 0,
                tsrCount: 0,
                thankYouUsed: false,
                assuranceUsed: false
            });
            onSubmit(); // refresh ask list
        } catch (err) {
            console.error('Error submitting ask:', err);
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{ marginBottom: '2rem' }}>
            <label>
                Asked?
                <input type="checkbox" name="asked" checked={form.asked} onChange={handleChange} />
            </label>
            <br />

            <label>
                NCS Open Used?
                <input type="checkbox" name="ncsOpenUsed" checked={form.ncsOpenUsed} onChange={handleChange} />
            </label>
            <br />

            <button type="button" onClick={() => handleCount('blrCount')}>
                Add BLR ({form.blrCount})
            </button>

            <button type="button" onClick={() => handleCount('tsrCount')}>
                Add TSR ({form.tsrCount})
            </button>
            <br />

            <label>
                Thanked Client?
                <input type="checkbox" name="thankYouUsed" checked={form.thankYouUsed} onChange={handleChange} />
            </label>
            <br />

            <label>
                Assurance Statement?
                <input type="checkbox" name="assuranceUsed" checked={form.assuranceUsed} onChange={handleChange} />
            </label>
            <br />

            <button type="submit">Submit Ask</button>
        </form>
    );
}