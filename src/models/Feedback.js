const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
    message: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500 // 限制意見回饋訊息長度
    },
    contactInfo: { // 使用者可選填的聯絡資訊
        type: String,
        trim: true,
        maxlength: 100
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Feedback = mongoose.model('Feedback', feedbackSchema);
module.exports = Feedback;
