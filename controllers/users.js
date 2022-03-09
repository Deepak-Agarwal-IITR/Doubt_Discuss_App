const User = require('../models/user')
const Course = require('../models/course')
const Notification = require('../models/notification');

module.exports.renderRegisterForm = (req,res)=>{
    res.render('users/register')
};

module.exports.register = async (req,res)=>{
    try {
        const { email, password ,name} = req.body.user;
        const user = new User();
        console.log(user)
        user.username = email;
        user.name = name;
        user.google = {};
        const registeredUser = await User.register(user, password);
        //console.log(registeredUser);
        req.login(registeredUser,err=>{
            if(err) return next(err);
            req.flash('success', 'Welcome!')
            res.redirect('/courses');
        })
    } catch (e) {
        req.flash('error',e.message)
        res.redirect('/register')
    }
};

module.exports.renderLoginForm = (req,res)=>{
    res.render('users/login')
};

module.exports.login = (req, res) => {
    req.flash('success','Welcome back!')
    const redirectUrl = req.session.returnTo || '/courses'
    delete req.session.returnTo;
    res.redirect(redirectUrl)
};

module.exports.logout = (req,res)=>{
    req.logout();
    req.flash('success','Bye! You are logged out successfully.')
    res.redirect('/courses')
};

module.exports.showAllNotifications = async(req, res) => {
    const foundNotifications = await Notification.find({receivers:{ $elemMatch: { id: req.user._id } } });
    const notifications = foundNotifications.map(function makeNoti(noti){
        noti.isResolved =  noti.receivers.find(receiver => receiver.id.toString()===req.user._id.toString()).isResolved;
        return noti;
    });
    res.render('users/notifications',{notifications});
};

module.exports.resolveNotification = async(req,res)=>{
    const toAccept = req.query.toAccept;
    const notification = await Notification.findById(req.params.id);
    const course = await Course.findById(notification.course._id);
    const sender = await User.findById(notification.sender._id);
    const receiver = await User.findById(req.user._id);
    
    if(toAccept=="true"){
        course.users.push(notification.sender);
        await course.save();
        notification.receivers[0].isResolved = true;
        await notification.save();

        const sendNotification = new Notification({ 
            description: `You have been enrolled in <a href=/courses/${course._id}>${course.name}</a> by ${receiver.username}.`, 
            sender: req.user._id, 
            receivers: [{id: notification.sender._id}], 
            category: 'message',
            createdOn : new Date() 
        });
        await sendNotification.save();

        req.flash('success',`${sender.username} has been Enrolled in the course: ${course.name}.`)
        res.redirect('/notifications');
    } else {
        notification.receivers[0].isResolved = true;
        await notification.save();

        const sendNotification = new Notification({ 
            description: `Your request for enrolling in <a href=/courses/${course._id}>${course.name}</a> by ${receiver.username} has been canceled.`, 
            sender: req.user._id, 
            receivers: [{id:notification.sender._id}], 
            category: 'message',
            createdOn : new Date() 
        });
        await sendNotification.save();
        
        req.flash('success',`${sender.username} request has been canceled for the course: ${course.name}.`)
        res.redirect('/notifications');
    }
};