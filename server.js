const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const mongodb = require('mongodb');
const mongoose = require('mongoose');
const MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectId;

const uri = "mongodb+srv://JeffAbney:warhol88@cluster0-schfu.mongodb.net/test?retryWrites=true";
MongoClient.connect(uri, { useNewUrlParser: true }, (error, client) => {
  if (error) return process.exit(1);
  var db = client.db('FCC');
  var collection = db.collection('Exercise');
  console.log("connection is working");

  app.use(cors());

  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());


  app.use(express.static('public'));
  app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/index.html')
  });


  // Not found middleware
  /* app.use((req, res, next) => {
     return next({ status: 404, message: 'not found' })
   }) */

  // Error Handling middleware
  app.use((err, req, res, next) => {
    let errCode, errMessage

    if (err.errors) {
      // mongoose validation error
      errCode = 400 // bad request
      const keys = Object.keys(err.errors)
      // report the first validation error
      errMessage = err.errors[keys[0]].message
    } else {
      // generic or custom error
      errCode = err.status || 500
      errMessage = err.message || 'Internal Server Error'
    }
    res.status(errCode).type('txt')
      .send(errMessage)
  })

  //Jeff's code goes here
  app.post("/api/exercise/new-user", (req, res, next) => {
    username = req.body.username;

    collection.findOne({ username: username }, (error, doc) => {
      if (error) next(error);
      if (doc != null) next("User already exists: " + doc.username + "  Id: " + doc._id);
      else {
        collection.insert({ username: username }, (error, results) => {
          if (error) return res.json({ "error": "Could not add user" })
          console.log("New user: " + results.ops[0].username);
          return res.json({ username: results.ops[0].username, _id: results.ops[0]._id });
        })
      }
    })
  })

  app.get("/api/exercise/users", (req, res, next) => {
    console.log("Getting users...");
    collection.find({}, { username: 1, _id: 1 }).toArray((error, arr) => {
      if (error) next(error);
      console.log(arr);
      res.send(arr);
    })

  });

  app.post("/api/exercise/add", (req, res, next) => {
    console.log("Updating exercise records...");
    hexRegExp = /^(?=[a-f\d]{24}$)(\d+[a-f]|[a-f]+\d)/i;
    if (!hexRegExp.test(req.body.userId)) {
      next("Not a valid user ID");
    }
    collection.findOneAndUpdate({ _id: ObjectId(req.body.userId) },
      {
        $inc: { count: 1 },
        $push: {
          log: {
            "description": req.body.description,
            "duration": req.body.duration,
            "date": req.body.date ? new Date(req.body.date).toDateString() : new Date().toDateString()
          }
        }
      },
      {
        returnNewDocument: true
      },

      (error, doc) => {
        if (error) next("Not a valid user ID");
        if (doc.value == null) {
          next("No such UserId in database")
        } else {
          res.json({
            UserName: doc.value.username,
            "description": req.body.description,
            "duration": req.body.duration,
            "date": req.body.date ? new Date(req.body.date).toDateString() : new Date().toDateString(),
            "_id": req.body.userId
          });
        }
      })

  })

  app.get("/api/exercise/log", (req, res, next) => {
    console.log("Getting user data...")
    let id = req.query.userId;
    let from = req.query.from;
    let to = req.query.to;
    let limit = parseInt(req.query.limit);

    const limiter = function(el) {
      if(limit) {
        return el.slice(0, limit)
      }
      else return el;
    }


    hexRegExp = /^(?=[a-f\d]{24}$)(\d+[a-f]|[a-f]+\d)/i;
    if (!hexRegExp.test(id)) {
      next("Not a valid user ID");
    }
    collection.findOne({ _id: ObjectId(id) }, (error, doc) => {
      if (error) res.send(error);
      if (doc == null) {
        next("No such user Id in collection")
      }
      if (from || to) {
        console.log("log" , doc.log);
        console.log("from" , new Date(from), "to", to);
        console.log("ex date" , new Date(doc.log[0].date));
      //Filter results to include only exercise from query period
      let log = doc.log;
        if (from) {
          let newLog = doc.log.filter( ex => new Date(ex.date) > new Date(from)  )
          if (to) {
            newLog = newLog.filter( ex => new Date(ex.date) < new Date(to)  )
          }
          res.json(limiter(newLog))
          
        }
        else if (to) {
          log = doc.log.filter( ex => new Date(ex.date) < new Date(to)  )
          res.json(limiter(log));
        }
        
          
      } else {
        console.log("Here's the data");
        res.json(limiter(doc.log));
      }
    })

  })


  //Jeff's code ends here

  const listener = app.listen(process.env.PORT || 3000, () => {
    console.log('Your app is listening on port ' + listener.address().port)
  })
})