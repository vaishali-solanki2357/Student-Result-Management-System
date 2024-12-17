const express = require("express");
const cors = require("cors");
const bodyParser = require('body-parser');
const https = require('node:https');
const mongoose=require("mongoose");
const port = 4500;


const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());



async function main(){
    try{
        //connecting mongodb server
         await mongoose.connect("mongodb://127.0.0.1:27017/studentsDB");
         console.log("Connected to the server");

         const teachersSchema={
          id:Number,
          password:String

       }
         const studentSchema={
            name:String,
            RollNo:Number

         }
         const studentsInfoSchema={
            class:Number,
            section:String,
            studentsinfo:[studentSchema]
         }

         

         const studentMarksSchema={
          class:Number,
          section:String,
          studentmarks:[{Exam:String,Marks:[{studentName:String,studentRollNo:Number,Telugu:Number,Hindi:Number,English:Number,Maths:Number,Physics:Number,Biology:Number,Social:Number}]}]
         }
    
        const Student=mongoose.model("Student",studentSchema);
        const StudentInfo=mongoose.model("StudentInfo",studentsInfoSchema);
        const StudentMark=mongoose.model("StudentMark",studentMarksSchema);
        const TeachersInfo=mongoose.model("TeachersInfo",teachersSchema);

         
       async function IsTeacherExists(res,id,password){
        const checkTeacherExists=await TeachersInfo.findOne({id:id});
        console.log(checkTeacherExists);
        
        if(checkTeacherExists && checkTeacherExists.password==password){
          res.send("exists");
        }
        else{
          res.send("not exists");
        }
       }

        
        app.post("/teacherLogin",(req,res)=>{
          const id=req.body.id;
          const password=req.body.password;
          console.log(id);
          IsTeacherExists(res,id,password);
          
        })
        
    
   var isClassExists;

    async function  checkIfClassExits(Class,section,res){

      isClassExists=await StudentInfo.findOne({class:Class,section:section});
      if(!isClassExists){
        const newClass = new StudentInfo({
          class: Class,
          section: section,
          studentsinfo: []
        });
  
        await newClass.save();
        res.send("created class");
      }else{
        res.send("already class created");
      }

    }

    async function addStudent(res, name, rollno, Class, section) {

       
        const newStudent = new Student({
          name: name,
          RollNo: rollno,
          
        });
      
        console.log(Class);
        console.log(section);
        //checking whether that class and section exists
        const isClassExists=await StudentInfo.findOne({
          class: Class,
          section: section
        })

        var existingStudent,existingName,existingRollNo;
        //if class exists checking whether that student details entered already
        if(isClassExists){
        isClassExists.studentsinfo.map(student=>{
          if(student.name==name && student.RollNo==rollno){
                existingStudent=true;
          }
          else if(student.name==name || student.RollNo==rollno){
            if(student.name==name)
                     existingName=true;
            else{
               existingRollNo=true;
            }
      }
        })
      }else{
        console.log("no students registered");
      }
        if (existingStudent) {
          return res.send("Student details already entered");
         }
        else if(existingRollNo){
         return res.send(" Rollno already entered");
        }else if(existingName){
         return res.send(" Name already entered");
        } 
        else {
          //adding student
          const gettingClass = await StudentInfo.findOneAndUpdate(
            { class: Class, section: section },
            { $push: { studentsinfo: newStudent } },
            { new: true }
          );
      
          if (gettingClass) {
           return res.send("Student details added");
          } else {
            //if classroom not created creating it and registering student
            const newStudentInfo = new StudentInfo({
              class: Class,
              section: section,
              studentsinfo: [newStudent],
            });
      
            await newStudentInfo.save();
           return res.send("Student details added");
          }
        }
      }
      
      var Class;
      var section;
    
        app.post("/",function(req,res){
            const name=req.body.Name;
            const rollno=req.body.rollno;
            Class=req.body.Class;
            section=req.body.section;
         
            addStudent(res,name,rollno,Class,section);
        
        })

        app.post("/selectClass",(req,res)=>{
           Class=req.body.Class;
           section=req.body.section;
        
          checkIfClassExits(Class,section,res);

        })

        async  function  checkStudentMarksExists(name,rollno,exam,Class,section){
          const checkClassExists=await StudentMark.findOne({class:Class,section:section,"studentmarks.Exam":exam});
          var isStudentExist=null;
          if(checkClassExists){
          isStudentExist = await StudentMark.findOne({
            "studentmarks": {
              $elemMatch: {
                "Exam": exam,
                "Marks": {
                  $elemMatch: {
                    "studentName": name,
                    "studentRollNo": rollno
                  }
                }
              }
            }
          });

         }
          else{
            console.log("not entered");
          }
          return  isStudentExist;
          
        }

        async function DisplayStudents(res,Class,section,exam){
                const list=[];
                //checking whether any students are there in that class
                const getList=await StudentInfo.findOne({class:Class,section:section});
             
                if(!getList){
                  res.send("no students");
                }else{
                  for(const details of getList.studentsinfo){
                  //checking whether that particular student marks entered or not.If entered his name will not be sent to enter marks page
                   const check=await checkStudentMarksExists(details.name,details.RollNo,exam,Class,section);

                   if(!check){
                    list.push({name:details.name,rollno:details.RollNo});
                   }
                    else
                      console.log("marks entered");
                  }
                  
                  res.send(list);
                  
                  //checking whether any room is created for that section to enter marks
                  const getmarks=await StudentMark.findOne({class:Class,section:section});

                  if(!getmarks){
                    var exammarksdetails={Exam:exam,
                                          Marks:[]}
                    const entermarks=new StudentMark({
                      class:Class,
                      section:section,
                      studentmarks:[exammarksdetails]

                    })
                    entermarks.save();
                    console.log("created marksheet ready to enter marks")
                    
                  }else{
                    //checking whether any room is created for that section to enter marks for that particular exam
                    const checkClassExists=await StudentMark.findOne({class:Class,section:section,"studentmarks.Exam":exam});
                    if(!checkClassExists){
                      var exammarksdetails={Exam:exam,
                        Marks:[]}
                        const entermarks=await StudentMark.findOneAndUpdate({class:Class,section:section},
                          {$push:{studentmarks:exammarksdetails}})

                    }
                    else
                     console.log("marksheet exists");
                   
                  }
                  
                }
        }

        var exam;
        app.post("/displayNames",(req,res)=>{
          Class=req.body.Class;
           section=req.body.section;
           exam=req.body.exam;
            
           DisplayStudents(res,Class,section,exam);

        })

        async function EnterMarks(res,name,rollno,Telugu,Hindi,English,Maths,Physics,Biology,Social,exam){
          console.log(name);
          console.log(rollno);
          //checking whether any room created to enter marks of that particular exam
          const checkClassExists=await StudentMark.findOne({class:Class,section:section});
          const studentdetails={
            studentName:name,studentRollNo:rollno,Telugu:Telugu,Hindi:Hindi,English:English,Maths:Maths,Physics:Physics,Biology:Biology,Social:Social
          }
          if(checkClassExists){
         for(const obj of  checkClassExists.studentmarks){
            if(obj.Exam==exam){
              for(const student of  obj.Marks){
                // console.log(student);
                if(student.studentName==name && student.studentRollNo==rollno){
                 return res.send("Student marks already entered");
                }
              }
               
                  const addStudentMarks= await StudentMark.findOneAndUpdate({class:Class,section:section,"studentmarks.Exam":exam},
                                                                                               {$push:{ "studentmarks.$.Marks": studentdetails }},
                                                                                               {new:true}
                                                                                               
                                                                                               )
                                      if(addStudentMarks){
                                        console.log("mark added");
                                       return res.send("student marks added");
                                      }
                                      else{
                                        console.log("mark not added");
                                      return  res.send("student marks not added");
                                      }
                }
                          }
          
        }
        else{
          var exammarksdetails={Exam:exam,
                          Marks:[studentdetails]}
            const entermarks=new StudentMark({
            class:Class,
            section:section,
            studentmarks:[exammarksdetails]
            
            })
            entermarks.save();
        }


        }

        app.post("/enterMarks",(req,res)=>{
            console.log("entermarks");
            const name=req.body.name;
            const rollno=req.body.rollno;
            const Telugu=req.body.Telugu;
            console.log(Telugu)
            const Hindi=req.body.Hindi;
            const English=req.body.English;
            const Maths =req.body.Maths;
            const Physics=req.body.Physics;
            const Biology=req.body.Biology;
            const Social=req.body.Social;

            EnterMarks(res,name,rollno,Telugu,Hindi,English,Maths,Physics,Biology,Social,exam);
            
        })

        async function DisplayMarks(exam,Class,section,res){
            //checking whether marks are entered for that class and section for that exam.If not entered then we couldnt edit
              const getStudentsMarksList=await StudentMark.find({class:Class,section:section,"studentmarks.Exam":exam});
              
              var List=[];
              if(getStudentsMarksList.length>0){
                 getStudentsMarksList.forEach(obj=>{
                   obj.studentmarks.map(obj1=>{
                    if(obj1.Exam===exam){
                      List=obj1.Marks.map(det=>{
                        return det;
                      })
                    }
                   })
                 })

                if(List.length>0)
                      res.send(List);
                else{
                  res.send("No marks entered to edit")
                }
              }else{
                res.send("No marks entered to edit")
              }
        }

        app.post("/displayMarks",(req,res)=>{
         exam=req.body.exam;
         Class=req.body.Class;
         section=req.body.section;
          DisplayMarks(exam,Class,section,res);
        })
 
        async function EditMarks(res,name,rollno,Telugu,Hindi,English,Maths,Physics,Biology,Social,exam){
          const updatedmarks={studentName:name,studentRollNo:rollno,Telugu:Telugu,Hindi:Hindi,English:English,Maths:Maths,Physics:Physics,Biology:Biology,Social:Social}
          //updating marks
          var updated;
          const isClassExists=await StudentMark.findOne({class:Class,section:section});
          if(isClassExists){
            for(var obj of isClassExists.studentmarks){
              if(obj.Exam==exam){
                
                    for (var i = 0; i < obj.Marks.length; i++) {
                      if (obj.Marks[i].studentName === name && obj.Marks[i].studentRollNo === rollno) {
                        obj.Marks[i] = updatedmarks;
                        break;
                      }
                    }
          
                    updated = await isClassExists.save();
        
                  }
                }
              }
            
          
          if(updated){
            const getStudentsMarksList=await StudentMark.find({class:Class,section:section});
            var List=[];
            if(getStudentsMarksList){
               getStudentsMarksList.forEach(obj=>{
                 obj.studentmarks.map(obj1=>{
                  if(obj1.Exam===exam){
                    List=obj1.Marks.map(det=>{
                      return det;
                    })
                  }
                 })
               })
                 res.send(List);
            }
          }else{
            res.send("failed to update marks");
          }
        }

      app.post("/editMarks",(req,res)=>{
        const name=req.body.name;
            const rollno=req.body.rollno;
            const Telugu=req.body.Telugu;
            const Hindi=req.body.Hindi;
            const English=req.body.English;
            const Maths =req.body.Maths;
            const Physics=req.body.Physics;
            const Biology=req.body.Biology;
            const Social=req.body.Social;
            EditMarks(res,name,rollno,Telugu,Hindi,English,Maths,Physics,Biology,Social,exam)
      })

      async function  GetMarks(res,Class,section,exam,subject){
          var sum=0,count=0,min=100,max=0;
          const Grade={
            A1:0,A2:0,B1:0,B2:0,C1:0,C2:0,D1:0,D2:0
           
          }
          //checking whether marks entered for that class section for that particular exam if entered we find avg,max,min,grades.
           const getmarks=await StudentMark.findOne({class:Class,section:section,"studentmarks.Exam":exam});
           if(getmarks){
             const marksData=getmarks.studentmarks.find(obj=>obj.Exam===exam);
             if(marksData){
              if(subject==="Telugu")
              {
                marksData.Marks.map(marks=>{
                  if(marks.Telugu<min){
                    min=marks.Telugu;
                  }
                  marks.Telugu>=0 && marks.Telugu<=34?Grade.D2++:marks.Telugu>=35 && marks.Telugu<=40?Grade.D1++:marks.Telugu>=41 && marks.Telugu<=50?Grade.C2++:marks.Telugu>=51 && marks.Telugu<=60?Grade.C1++:marks.Telugu>=61 && marks.Telugu<=70?Grade.B2++:marks.Telugu>=71 && marks.Telugu<=80?Grade.B1++:marks.Telugu>=81 && marks.Telugu<=90?Grade.A2++:Grade.A1++;
                  if(marks.Telugu>max){
                    max=marks.Telugu;
                  }
                  sum+=marks.Telugu;
                  count++;
                })
               
              }
              else if(subject==="Hindi")
              {
                
                marksData.Marks.map(marks=>{
                  sum+=marks.Hindi;
                  count++;
                  if(marks.Hindi<min){
                    min=marks.Hindi;
                  }
                  marks.Hindi>=0 && marks.Hindi<=34?Grade.D2++:marks.Hindi>=35 && marks.Hindi<=40?Grade.D1++:marks.Hindi>=41 && marks.Hindi<=50?Grade.C2++:marks.Hindi>=51 && marks.Hindi<=60?Grade.C1++:marks.Hindi>=61 && marks.Hindi<=70?Grade.B2++:marks.Hindi>=71 && marks.Hindi<=80?Grade.B1++:marks.Hindi>=81 && marks.Hindi<=90?Grade.A2++:Grade.A1++;
                  if(marks.Hindi>max){
                    max=marks.Hindi;
                  }
                })
               
              }
              if(subject==="English")
              {
                
                marksData.Marks.map(marks=>{
                  sum+=marks.English;
                  count++;
                  if(marks.English<min){
                    min=marks.English;
                  }
                  marks.English>=0 && marks.English<=34?Grade.D2++:marks.English>=35 && marks.English<=40?Grade.D1++:marks.English>=41 && marks.English<=50?Grade.C2++:marks.English>=51 && marks.English<=60?Grade.C1++:marks.English>=61 && marks.English<=70?Grade.B2++:marks.English>=71 && marks.English<=80?Grade.B1++:marks.English>=81 && marks.English<=90?Grade.A2++:Grade.A1++;
                  if(marks.English>max){
                    max=marks.English;
                  }
                })
               
              }
              if(subject==="Maths")
              {
               
                marksData.Marks.map(marks=>{
                  sum+=marks.Maths;
                  count++;
                  if(marks.Maths<min){
                    min=marks.Maths;
                  }
                  marks.Maths>=0 && marks.Maths<=34?Grade.D2++:marks.Maths>=35 && marks.Maths<=40?Grade.D1++:marks.Maths>=41 && marks.Maths<=50?Grade.C2++:marks.Maths>=51 && marks.Maths<=60?Grade.C1++:marks.Maths>=61 && marks.Maths<=70?Grade.B2++:marks.Maths>=71 && marks.Maths<=80?Grade.B1++:marks.Maths>=81 && marks.Maths<=90?Grade.A2++:Grade.A1++;
                  if(marks.Maths>max){
                    max=marks.Maths;
                  }
                })
               
              }
              if(subject==="Science")
              {
               
                marksData.Marks.map(marks=>{
                  sum+=marks.Physics+marks.Biology;
                  count++;
                  if(marks.Physics<min){
                    min=marks.Physics;
                  }
                  marks.Physics+marks.Biology>=0 && marks.Physics+marks.Biology<=34?Grade.D2++:marks.Physics+marks.Biology>=35 && marks.Physics+marks.Biology>=51 && marks.Physics+marks.Biology<=60?Grade.C1++:marks.Physics+marks.Biology>=61 && marks.Physics+marks.Biology<=70?Grade.B2++:marks.Physics+marks.Biology>=71 && marks.Physics+marks.Biology<=80?Grade.B1++:marks.Physics+marks.Biology>=81 &&marks.Physics+marks.Biology<=90?Grade.A2++:Grade.A1++;
                  if(marks.Physics>max){
                    max=marks.Physics;
                  }
                })
               
              }
              // if(subject==="Biology")
              // {
                
              //   marksData.Marks.map(marks=>{
              //     sum+=marks.Biology;
              //     count++;
              //     if(marks.Biology<min){
              //       min=marks.Biology;
              //     }
              //     marks.Biology>=0 && marks.Biology<=34?Grade.D2++:marks.Biology>=35 && marks.Biology<=40?Grade.D1++:marks.Biology>=41 && marks.Biology<=50?Grade.C2++:marks.Biology>=51 && marks.Biology<=60?Grade.C1++:marks.Biology>=61 && marks.Biology<=70?Grade.B2++:marks.Biology>=71 && marks.Biology<=80?Grade.B1++:marks.Biology>=81 && marks.Biology<=90?Grade.A2++:Grade.A1++;
              //     if(marks.Biology>max){
              //       max=marks.Biology;
              //     }
              //   })
               
              // }
              if(subject==="Social")
              {
                
                marksData.Marks.map(marks=>{
                  sum+=marks.Social;
                  count++;
                  if(marks.Social<min){
                    min=marks.Social;
                  }
                  marks.Social>=0 && marks.Social<=34?Grade.D2++:marks.Social>=35 && marks.Social<=40?Grade.D1++:marks.Social>=41 && marks.Social<=50?Grade.C2++:marks.Social>=51 && marks.Social<=60?Grade.C1++:marks.Social>=61 && marks.Social<=70?Grade.B2++:marks.Social>=71 && marks.Social<=80?Grade.B1++:marks.Social>=81 && marks.Social<=90?Grade.A2++:Grade.A1++;
                  if(marks.Social>max){
                    max=marks.Social;
                  }
                })
               
              }
             }

             const results={
              avg:sum/count,
              min:min,
              max:max,
              A1:Grade.A1,
              A2:Grade.A2,
              B1:Grade.B1,
              B2:Grade.B2,
              C1:Grade.C1,
              C2:Grade.C2,
              D1:Grade.D1,
              D2:Grade.D2

             }
             if(results.avg>0)
                 res.send(results);
                 else{
                  res.send("No marks exists");
                 }
           }
           else{
            res.send("No marks exists");
           }
      }

      app.post("/getMarks",(req,res)=>{
        Class=req.body.Class;
        section=req.body.section;
        exam=req.body.exam;
        const subject=req.body.subject;
        GetMarks(res,Class,section,exam,subject);
      })

      async function CheckMarks(res,rollno,Class,section,password){
       //checking whether in that class whether tha roll number student exists or not.
        isStudentExists=await StudentInfo.findOne({class:Class,section:section});
   
       var flag=0;
        if(isStudentExists){
         isStudentExists.studentsinfo.map(details=>{
            if(details.RollNo==rollno){
           flag=1;
          }
         })
         if(flag==1){
          //checking whether marks are entered for that class section
         var isClassMarksEntered=await StudentMark.findOne({class:Class,section:section});
         if(isClassMarksEntered){
          var AS1=null,AS2=null,SA1=null,SA2=null,marks;
          
          isClassMarksEntered.studentmarks.map(obj=>{
            
            if(obj.Exam=='AS1' && obj.Marks.length>0){
              let marksList=[];
              var Telugu,Hindi,English,Maths,Physics,Biology,Social,totalmarks=0,result;
              obj.Marks.map(det=>{
                    if(det.studentRollNo==rollno){
                     Telugu=det.Telugu;
                      Hindi=det.Hindi;
                      English=det.English;
                      Maths=det.Maths;
                      Physics=det.Physics;
                      Biology=det.Biology;
                      Social=det.Social;
                     
                    }
                    totalmarks=det.Telugu+det.Hindi+det.English+det.Maths+det.Physics+det.Biology+det.Social;
                    if(det.Telugu<35 || det.Hindi<35||det.English<35||det.Maths<35||det.Physics+det.Biology<35||det.Social<35)
                    {
                      marksList.push({RollNo:det.studentRollNo,Tot:totalmarks,fail:1});
                    }
                    else{
                    marksList.push({RollNo:det.studentRollNo,Tot:totalmarks,fail:0});
                    }
                    
              })
              const sortedmarkslist=marksList.sort((a,b)=>{
                if(a.fail!==1 && b.fail!==1){
                   return  b.Tot-a.Tot;
                }
                else if(a.fail===1){
                  return 1;
                }else{
                  return -1;
                }
              })
              console.log(sortedmarkslist+"ss");
              marksList.map((student,index)=>{
                console.log(student.RollNo);
                  if(student.RollNo==rollno){
                    console.log(student.fail);
                    if(student.fail==1){ 
                      result={Total:student.Tot,Rank:"fail"};
                    }else{
                      result={Total:student.Tot,Rank:index+1};
                    }
                    AS1={Telugu:Telugu,Hindi:Hindi,English:English,Maths:Maths,Physics:Physics,Biology:Biology,Social:Social,Total:result.Total,Rank:result.Rank};
                  }
                 
              })
              
             
            }
            if(obj.Exam=='AS2' && obj.Marks.length>0){
              let marksList=[];
              var Telugu,Hindi,English,Maths,Physics,Biology,Social,totalmarks=0,result;
              obj.Marks.map(det=>{
                    if(det.studentRollNo==rollno){
                     Telugu=det.Telugu;
                      Hindi=det.Hindi;
                      English=det.English;
                      Maths=det.Maths;
                      Physics=det.Physics;
                      Biology=det.Biology;
                      Social=det.Social;
                      
                    }
                    totalmarks=det.Telugu+det.Hindi+det.English+det.Maths+det.Physics+det.Biology+det.Social;
                    if(det.Telugu<35 || det.Hindi<35||det.English<35||det.Maths<35||det.Physics+det.Biology<35||det.Social<35)
                    {
                      marksList.push({RollNo:det.studentRollNo,Tot:totalmarks,fail:1});
                    }
                    else{
                    marksList.push({RollNo:det.studentRollNo,Tot:totalmarks,fail:0});
                    }
                    
              })
              const sortedmarkslist=marksList.sort((a,b)=>{
                if(a.fail!==1 && b.fail!==1){
                   return  b.Tot-a.Tot;
                }
                else if(a.fail===1){
                  return 1;
                }else{
                  return -1;
                }
              })
              console.log(sortedmarkslist);
              marksList.map((student,index)=>{
                console.log(student.RollNo);
                  if(student.RollNo==rollno){
                    console.log(student.fail);
                    if(student.fail==1){ 
                      result={Total:student.Tot,Rank:"fail"};
                    }else{
                      result={Total:student.Tot,Rank:index+1};
                    }
                    AS2={Telugu:Telugu,Hindi:Hindi,English:English,Maths:Maths,Physics:Physics,Biology:Biology,Social:Social,Total:result.Total,Rank:result.Rank};
                  }
              })
              
            }
            if(obj.Exam=='SA1' && obj.Marks.length>0){
              let marksList=[];
              var Telugu,Hindi,English,Maths,Physics,Biology,Social,totalmarks=0,result;
              obj.Marks.map(det=>{
                    if(det.studentRollNo==rollno){
                     Telugu=det.Telugu;
                      Hindi=det.Hindi;
                      English=det.English;
                      Maths=det.Maths;
                      Physics=det.Physics;
                      Biology=det.Biology;
                      Social=det.Social;
                      
                    }
                    totalmarks=det.Telugu+det.Hindi+det.English+det.Maths+det.Physics+det.Biology+det.Social;
                    if(det.Telugu<35 || det.Hindi<35||det.English<35||det.Maths<35||det.Physics+det.Biology<35||det.Social<35)
                    {
                      marksList.push({RollNo:det.studentRollNo,Tot:totalmarks,fail:1});
                    }
                    else{
                    marksList.push({RollNo:det.studentRollNo,Tot:totalmarks,fail:0});
                    }
                    
              })
              const sortedmarkslist=marksList.sort((a,b)=>{
                if(a.fail!==1 && b.fail!==1){
                   return  b.Tot-a.Tot;
                }
                else if(a.fail===1){
                  return 1;
                }else{
                  return -1;
                }
              })
              console.log(sortedmarkslist);
              marksList.map((student,index)=>{
                console.log(student.RollNo);
                  if(student.RollNo==rollno){
                    console.log(student.fail);
                    if(student.fail==1){ 
                      result={Total:student.Tot,Rank:"fail"};
                    }else{
                      result={Total:student.Tot,Rank:index+1};
                    }
                    SA1={Telugu:Telugu,Hindi:Hindi,English:English,Maths:Maths,Physics:Physics,Biology:Biology,Social:Social,Total:result.Total,Rank:result.Rank};
                  }
                  
              })
              
            }
            if(obj.Exam=='SA2' && obj.Marks.length>0){
              let marksList=[];
              var Telugu,Hindi,English,Maths,Physics,Biology,Social,totalmarks=0,result;
              obj.Marks.map(det=>{
                    if(det.studentRollNo==rollno){
                     Telugu=det.Telugu;
                      Hindi=det.Hindi;
                      English=det.English;
                      Maths=det.Maths;
                      Physics=det.Physics;
                      Biology=det.Biology;
                      Social=det.Social;
                      
                    }
                    totalmarks=det.Telugu+det.Hindi+det.English+det.Maths+det.Physics+det.Biology+det.Social;
                    if(det.Telugu<35 || det.Hindi<35||det.English<35||det.Maths<35||det.Physics+det.Biology<35||det.Social<35)
                    {
                      marksList.push({RollNo:det.studentRollNo,Tot:totalmarks,fail:1});
                    }
                    else{
                    marksList.push({RollNo:det.studentRollNo,Tot:totalmarks,fail:0});
                    }
                    
              })
              const sortedmarkslist=marksList.sort((a,b)=>{
                if(a.fail!==1 && b.fail!==1){
                   return  b.Tot-a.Tot;
                }
                else if(a.fail===1){
                  return 1;
                }else{
                  return -1;
                }
              })
              console.log(sortedmarkslist);
              marksList.map((student,index)=>{
                console.log(student.RollNo);
                  if(student.RollNo==rollno){
                    console.log(student.fail);
                    if(student.fail==1){ 
                      result={Total:student.Tot,Rank:"fail"};
                    }else{
                      result={Total:student.Tot,Rank:index+1};
                    }
                    SA2={Telugu:Telugu,Hindi:Hindi,English:English,Maths:Maths,Physics:Physics,Biology:Biology,Social:Social,Total:result.Total,Rank:result.Rank};
                  }
              })
              
            }
             marks={
              AS1:AS1,
              SA1:SA1,
              AS2:AS2,
              SA2:SA2
            }
            
          })
          if(AS1!=null || SA1!=null || AS2!=null || SA2!=null){
            res.json({marks});
           
          }else{
            res.send("Marks are not entered yet")
          }
        }
      }else{
        res.send("No such student with those details");
      }
    }else{
      res.send("student not registered yet");
    }
  }
    

      app.post("/checkMarks",(req,res)=>{
     
       rollno=req.body.RollNo;
       Class=req.body.Class;
       section=req.body.section;
       const password=req.body.Password;
       CheckMarks(res,rollno,Class,section,password);
      })


  async function getRankList(res,Class,section,exam){
    isMarksExists=await StudentMark.findOne({class:Class,section:section});
    const markList=[];
    var fail=0;
    if(isMarksExists){
      isMarksExists.studentmarks.map(obj=>{
         if(obj.Exam==exam){
            obj.Marks.map(marks=>{
                fail=0
               const tot=marks.Telugu+marks.Hindi+marks.English+marks.Maths+marks.Physics+marks.Biology+marks.Social;
               if(marks.Telugu<35||marks.Hindi<35||marks.English<35||marks.Maths<35||marks.Physics+marks.Biology<35||marks.Social<35){
                  fail=1;      
               }
                markList.push({name:marks.studentName,rollno:marks.studentRollNo,telugu:marks.Telugu,hindi:marks.Hindi,english:marks.English,maths:marks.Maths,physics:marks.Physics,biology:marks.Biology,social:marks.Social,total:tot,fail:fail})
            })
         }
      })
        
      const sortedmarkslist=markList.sort((a,b)=>{
        if(a.fail!==1 && b.fail!==1){
           return  b.total-a.total;
        }
        else if(a.fail===1){
          return 1;
        }else{
          return -1;
        }
      })
      res.send(sortedmarkslist);
    }
  }

     
     
 
       app.post("/getRankList",(req,res)=>{
        Class=req.body.Class;
        section=req.body.section;
        const exam=req.body.exam;
        getRankList(res,Class,section,exam);
       })

      
    }
    catch(err){
        console.log(err);
    }
}

main().catch(console.error);
//listening to port 4500
app.listen(4500,(req,res)=>{
    console.log("server is running on port 4500");
})