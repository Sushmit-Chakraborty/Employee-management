require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const ejs = require('ejs')
const mongoose = require('mongoose')
const session = require('express-session')
const _ = require('lodash')
const uniqueValidator = require('mongoose-unique-validator')
const passport = require('passport')
const passportLocalMongoose = require('passport-local-mongoose')
const findOrCreate = require('mongoose-findorcreate')

const app = express()

app.use(express.static(__dirname + '/public'));
app.set('view engine','ejs')
app.use(bodyParser.urlencoded({extended:true}))

app.use(session({
    secret: "Little secret",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/employerDBTest",{useNewUrlParser:true,useUnifiedTopology:true});

const employeeSchema = new mongoose.Schema({
    name:String,
    address:String,
    phone:String
})

const Employee = mongoose.model("Employee",employeeSchema)


const employerSchema = new mongoose.Schema({
    username:String,
    password:String,
    alias :String,
    employees:[employeeSchema]
})

employerSchema.plugin(uniqueValidator)
employerSchema.plugin(passportLocalMongoose)
employerSchema.plugin(findOrCreate)

const Employer = mongoose.model("Employer",employerSchema)

passport.use(Employer.createStrategy())

passport.serializeUser(function(user, done) {
    done(null, user.id);
});
  
passport.deserializeUser(function(id, done) {
    Employer.findById(id, function(err, user) {
      done(err, user);
    });
});

// GET REQUESTS
app.get('/',function(req,res){
    res.render('home')
})

app.get('/register',function(req,res){
    res.render('register');
});

app.get('/login',function(req,res){
    res.render('login');
});

app.get('/landingPage',function(req,res){
    res.render('landingPage')
})

app.get('/profile/addNew',function(req,res){
    res.render('addNewEmployee')
})

app.get("/logout",function(req,res){
    req.logout();
    res.redirect("/");
})

// POST REQUEST
app.post('/register',function(req,res){
    Employer.register({username:req.body.username},req.body.password,function(err,user){
        if(err){
            console.log(err)
            res.redirect('/register')
        }
        else{
            passport.authenticate('local')(req,res,function(){
                res.redirect('landingPage')
            })
        }
    })
})

app.post('/landingPage',function(req,res){
    const alias = req.body.alias
    Employer.findById(req.user.id,function(err,foundUser){
        if(err){
            console.log(err)
        }
        else{
            foundUser.alias = alias
            foundUser.save()
            res.render("profile",{user:foundUser});
        }
    })
})

app.post('/login',function(req,res){
    const employer = new Employer({
        username:req.body.username,
        password:req.body.password
    })

    req.login(employer,function(err){
        if(err){
            console.log(err)
        }
        else{
            passport.authenticate('local')(req,res,function(){
                if(req.user.alias === undefined){
                    res.redirect('/landingPage')
                }
                else{
                    res.render('profile',{user:req.user})
                }
            })
        }
    })
})

app.post('/addNewEmployee',function(req,res){
    const Name = req.body.employeeName
    const Address = req.body.employeeAddress
    const Phone = req.body.employeePhone
    const employee = new Employee({
        name:Name,
        address:Address,
        phone:Phone
    })
    employee.save()
    Employer.findById(req.user.id,function(err,foundUser){
        foundUser.employees.push(employee)
        foundUser.save()
        res.render('profile',{user:req.user})
    })
})

app.post('/deleteEmployee',function(req,res){
    const employeeId = req.body.employee
    console.log(employeeId)
    Employer.findById(req.user.id,function(err,foundUser){
        for(i=0;i<foundUser.employees.length;i++){
            if(foundUser.employees[i].name === employeeId){
                foundUser.employees.splice(i,1)
                foundUser.save()
                break
            }
        }
        res.render('profile',{user:foundUser})
    })
    
})

app.post('/editEmployee',function(req,res){
    const employeeId = req.body.employee
    Employee.findById(employeeId,function(err,foundEmployee){
        res.render('editEmployee',{employeeDetail:foundEmployee})
    })
})

app.post('/editEmployeeDetails',function(req,res){
    const employeeId = req.body.employeeId
    const employeeName = req.body.employeeName
    const employeeAddress = req.body.employeeAddress
    const employeePhone = req.body.employeePhone
    var newUpdate = {
        name:employeeName,
        address:employeeAddress,
        phone:employeePhone
    }

    Employee.findById(employeeId,function(err,foundEmployee){
        Employer.findById(req.user.id,function(err,foundUser){
            for(i=0;i<foundUser.employees.length;i++){
                if(foundUser.employees[i].name === foundEmployee.name){
                    console.log('Inside')
                    foundUser.employees[i].name = employeeName
                    foundUser.employees[i].address = employeeAddress
                    foundUser.employees[i].phone = employeePhone
                    foundUser.save()
                    break
                }
            }
        })
    })
    Employee.findOneAndUpdate({_id:employeeId},newUpdate,function(err,foundEmployee){
        if(!err){
            foundEmployee.save()
        }
    })
    Employer.findById(req.user.id,function(err,foundUser){
        res.render('profile',{user:foundUser})
    })
})

app.listen(3000,function(){
    console.log('Server running on port 3000')
})