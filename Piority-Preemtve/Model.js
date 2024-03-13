class Model {
  constructor() {
    this.time = 0;
    this.processes = [];
    this.ReadyQueue = [];
    this.IOqueue = [];
    this.AllWaiting = 0;
    this.AllTurnAround = 0;
    this.TerminateCount = 0;
    this.maxMemory = 5120;
    this.memory = 0;
    this.intervalId = null;
    this.StartTimeClock();
  }
  async StartTimeClock() {
    setInterval(() => {
      this.time++;
    }, 1000)
  }

  addProcess(process) {
    if (this.memory < 100) {
      this.processes.push(process);
      this.ReadyQueue.push(process);
      this.startProcess();
      this.ManangeStatus();
    } else {
      alert("Cannot add more processes. Maximum limit reached.");
    }

    this.UpdateControlblock();
  }

  startProcess() {
    if (!this.intervalId) {
      this.intervalId = setInterval(() => {
        const readyQueue = this.getProcesses();
        readyQueue.forEach(process => {
          if (process.status === 'Ready') {
            process.waitingTime++; // เพิ่ม waiting time ทุกๆ 1 วินาที
          } else if (process.status === 'Running') {
            process.burstTime++; // เพิ่ม Burst-Time ทุกๆ 1 วินาที
          } else if (process.statusIO === 'Waiting') {
            process.RespondTime++; // เพิ่ม respond-Time ทุกๆ 1 วินาที
          } else if (process.statusIO === 'Running') {
            process.RunningTime++; // เพิ่ม Running-Time ทุกๆ 1 วินาที
          } 
        });
        // หลังจากทำการอัพเดทสถานะเสร็จแล้ว ส่งข้อมูลไปยัง View เพื่อแสดงผล
      }, 1000); // นับเวลาทุกๆ 1 วินาที
    }
  }

  setStatus(processName, newStatus) {
    const processTarget = this.processes.find(process => process.processName === processName);
    if (processTarget) {
      processTarget.status = newStatus;
    } else {
      console.error(`Process with name ${processName} not found.`);
    }
  }

  setReadyQueue() {
    this.ReadyQueue = []; // clear ข้อมูลแล้ว นำเข้าใหม่
    this.processes.forEach(process => {
      if (process.status === "Ready") {
        this.ReadyQueue.push(process);
      }
    });
  }
  ManangeStatus() {
    this.ReadyQueue.sort((a, b) => a.priority - b.priority);
    const runningProcess = this.processes.find(process => process.status === "Running");
    if (runningProcess) {
      // console.log(There is already a process running: ${runningProcess.processName});
      this.ReadyQueue.forEach(process => {
        if (process.status !== "Waiting") {
          this.setStatus(process.processName, "Ready");
        }
      });
      if((runningProcess.priority > this.ReadyQueue[0].priority)){
        const nextProcess = this.ReadyQueue.shift();
        if (nextProcess) {
          this.setStatus(nextProcess.processName, "Running");
          // console.log(Process ${nextProcess.processName} is now running.);
        } else {
          console.log("No processes in the ReadyQueue to run.");
        }
        runningProcess.status = 'Ready';
        this.setReadyQueue();
      }
    } else {
      // ทำการตั้งสถานะของ process ที่อยู่ใน ReadyQueue เป็น "Running"
      const nextProcess = this.ReadyQueue.shift();
      if (nextProcess) {
        this.setStatus(nextProcess.processName, "Running");
        // console.log(Process ${nextProcess.processName} is now running.);
      } else {
        console.log("No processes in the ReadyQueue to run.");
      }
    }
  }
  //  ------------------------
  // ส่วนของการนับ IO Processs
  //  ------------------------
  async addIODevice() {
    try {
      let processTarget = this.getRunningProcesses();
      processTarget[0].status = 'Waiting'; // ทำให้ Running ที่ดึงมาเปลี่ยนสถานะเป็น Waiting 
      processTarget[0].statusIO = 'Waiting'; // แล้วให้ StatusIO เป็น Waiting ด้วย
      this.IOqueue.push(processTarget[0])
      this.ManangeIO();
      this.ManangeStatus();
    } catch (error) {
      notyf.open({
        type: 'error',
        message: 'There are no processes Running the CPU..'
      });
    }
  }

  async DeleteIOdevice() {
    try {
      let processTarget = this.getRunningIOProcesses();
      processTarget[0].status = 'Ready';
      processTarget[0].statusIO = 'NotUse';

      this.getIODevice().shift();
      this.setReadyQueue();
      this.ManangeStatus();
      this.ManangeIO();
    } catch (error) {
      alert('There are no processes using the I/O.')
    
    }
  }

  async ManangeIO() {
    const runningProcess = this.processes.find(process => process.statusIO === "Running");
    console.log(runningProcess)
    if (runningProcess) {
      console.log(`There is already a process running: ${runningProcess.processName}`);
    } else {
      const nextProcess = this.IOqueue[0];
      if (nextProcess) {
        nextProcess.statusIO = "Running";
        console.log(nextProcess)
        console.log(`Process ${nextProcess.processName} is now running.`);
      } else {
        console.log("No processes in the IOqueue to run.");
      }
    }
  }

  //  ------------------------
  // ส่วนของTerminate
  //  ------------------------
  Terminate() {
    let runningProcesses = this.getRunningProcesses();
    this.TerminateCount += 1;
    const runningProcess = runningProcesses[0]; // เพราะรู้ว่า Running มีแค่ตัวเดียว
    const TurnaroundTime = this.time - runningProcess.arrivalTime;

    this.AllTurnAround += TurnaroundTime;
    this.AllWaiting += runningProcess.waitingTime;

    const index = this.processes.findIndex(process => process === runningProcess);
    if (index !== -1) {
      this.processes.splice(index, 1);
    }
    let NextRunning = this.ReadyQueue.shift();
    if (NextRunning) {
      NextRunning.status = "Running";
    }

    return { runningProcesses, TurnaroundTime };

  }


  // -----------------------
  // ส่วนของ control bloack
  // -------------------------
  async UpdateControlblock() {
    let SummentionMemory = this.getAllmemory();
    this.memory = (SummentionMemory / this.maxMemory) * 100;
    const runningProcesses = this.getRunningProcesses();
    const CheckrunningProcesses = runningProcesses.length > 0 ? runningProcesses[0].processName : "Not in use";

    const getIOrunningProcesses = this.getRunningIOProcesses();
    const CheckIOrunningProcesses = getIOrunningProcesses.length > 0 ? getIOrunningProcesses[0].processName : "Not in use";

    let AVGTurnaround = (this.AllTurnAround / this.TerminateCount).toFixed(2);
    let AVGWaitingTime = (this.AllWaiting / this.TerminateCount).toFixed(2);
    // ตรวจสอบค่า NaN และแทนที่ด้วย 0
    if (isNaN(AVGTurnaround)) {
      AVGTurnaround = 0;
    }
    if (isNaN(AVGWaitingTime)) {
      AVGWaitingTime = 0;
    }
    return { CheckrunningProcesses, CheckIOrunningProcesses, AVGTurnaround, AVGWaitingTime, memory: this.memory.toFixed(2) };
  }

  //  ------------------------
  //  return ค่า
  //  ------------------------
  getIODevice() {
    return this.IOqueue;
  }

  getReadyQueue() {
    return this.ReadyQueue;
  }

  getProcess(processName) {
    return this.processes.find(process => process.processName === processName);
  }

  getRunningProcesses() {
    return this.processes.filter(process => process.status === 'Running');
  }

  getReadyProcesses() {
    return this.processes.filter(process => process.status === 'Ready');
  }

  getRunningIOProcesses() {
    return this.processes.filter(process => process.statusIO === 'Running');
  }

  getWaitingProcesses() {
    return this.IOqueue.filter(process => process.statusIO === 'Waiting');
  }

  getProcesses() {
    return this.processes;
  }

  getAllmemory() {
    let AllSumMemory = this.processes.reduce((totalMemory, process) => {
      return totalMemory + process.memory_usage;
    }, 0);
    return AllSumMemory;
  }

  getRemaining_memory() {
    let SummentionMemory = this.getAllmemory();
    let remaining_memory = this.maxMemory;
    let result = remaining_memory - SummentionMemory;
    if (result > 512) {
      return 512
    } else {
      return result;
    }
  }
}

export default Model; 