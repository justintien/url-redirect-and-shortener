const Feedback = require('../models/Feedback');
const validator = require('validator');

exports.submitFeedback = async (req, res) => {
    const { message, contactInfo } = req.body;

    if (!message || message.trim().length === 0) {
        return res.status(400).json({ error: 'Feedback message cannot be empty.' });
    }

    if (message.length > 500) {
        return res.status(400).json({ error: 'Feedback message exceeds maximum length of 500 characters.' });
    }

    if (contactInfo && contactInfo.length > 100) {
        return res.status(400).json({ error: 'Contact information exceeds maximum length of 100 characters.' });
    }

    try {
        const newFeedback = new Feedback({
            message: message.trim(),
            contactInfo: contactInfo ? contactInfo.trim() : undefined
        });

        await newFeedback.save();
        res.status(201).json({ message: 'Feedback submitted successfully! Thank you for your input.' });

    } catch (err) {
        console.error('Error submitting feedback:', err);
        res.status(500).json({ error: 'Server error during feedback submission.' });
    }
};
