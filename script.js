'use strict';

// prettier-ignore

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);

  constructor(coords, distance, duration) {
    this.coords = coords; //[lat,lng]
    this.distance = distance; //km
    this.duration = duration; //min
  }
  // "Running on April 14"
  _setDiscription() {
    // prettier-ignore
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    this.discription = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calPace();
    this._setDiscription();
  }

  calPace() {
    this.pace = (this.duration / this.distance).toFixed(1); //min/km
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calSpeed();
    this._setDiscription();
  }

  calSpeed() {
    this.speed = (this.distance / (this.duration / 60)).toFixed(1); //km/h
    return this.speed;
  }
}

///////////////////////////////////////
// APPLICATION
//用OOP重构代码，原则是尽量将代码函数化、模块化
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
  #map;
  #mapEvent;
  #workouts = [];
  #mapZoomLevel = 13;
  constructor() {
    // 1.获取位置并加载，包括要在地图上操作的函数和点击事件
    this._getposition();
    // 2.获取存储数据并显示在列表中和地图上
    this._getLocalStorage();
    // 2.回车键提交表格时，在指定位置显示标志和弹窗
    form.addEventListener('submit', this._newWorkout.bind(this));
    // 3.切换running和cycling选择器对应的输入框
    inputType.addEventListener('change', this._toggleElevitionField);
    // 4.点击列表，移动到地图上对应的地方
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getposition() {
    navigator.geolocation.getCurrentPosition(
      this._loadMap.bind(this),
      function () {
        alert('Could not catch your position!');
      }
    );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];
    //leaflet生成的map变量
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);
    // // 标记并显示当前位置
    L.marker(coords).addTo(this.#map).bindPopup('当前位置').openPopup();
    //leafleft事件监听
    this.#map.on('click', this._showForm.bind(this));
    // 将存储过的数据标记在地图上
    this.#workouts.forEach(workout => this._renderWorkoutMarker(workout));
  }

  _showForm(mapE) {
    this.#mapEvent = mapE; //click事件时，显示form的同时，获得mapEvent
    form.classList.remove('hidden');
    inputDistance.focus();
    inputDuration.value = inputCadence.value = inputElevation.value = '';
  }

  _hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevitionField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    e.preventDefault();
    // 判断输入框的值是否有意义且为正数
    const validInput = (...inputs) => inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);
    // 从form获取数据
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // 如果是选择的是running，创建一个running对象
    if (type == 'running') {
      const cadence = +inputCadence.value;
      // 检查running（错误：弹窗提醒）
      if (
        !validInput(distance, duration, cadence) &&
        !allPositive(distance, duration, cadence)
      ) {
        return alert('Please input a positive number!');
      }
      // 生成一个Running对象
      workout = new Running([lat, lng], distance, duration, cadence);
    }
    // 如果是选择的是cylcing，创建一个cylcing对象
    if (type == 'cycling') {
      const elevation = +inputElevation.value;
      //检查cycling的输入值（错误：弹窗提醒）
      if (
        !validInput(distance, duration, elevation) &&
        !allPositive(distance, duration)
      ) {
        return alert('Please input a positive number!');
      }
      // 生成一个Cycling对象
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    //将Running和Cycling对象放进workouts数组里存储
    this.#workouts.push(workout);

    // 渲染在地图上：在map上生成marker和弹窗
    this._renderWorkoutMarker(workout);

    // 渲染在左侧列表：在form后面生成记录
    this._renderWorkout(workout);
    //隐藏表格
    this._hideForm();
    // 将数据存储起来
    this._setLocalStorage();
  }

  //在map上生成marker和弹窗
  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}${workout.discription}`,
        {
          maxWidth: 300,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        }
      )
      .openPopup();
  }
  // 在form后面生成记录
  _renderWorkout(workout) {
    let html = `<li class="workout workout--${workout.type}" data-id="${
      workout.id
    }">
          <h2 class="workout__title">${workout.discription}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            } </span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>`;
    if (workout.type === 'running')
      html += `<div class="workout__details">
            <span class="workout__icon">🥇</span>
            <span class="workout__value">${workout.pace}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>`;
    if (workout.type === 'cycling')
      html += `<div class="workout__details">
            <span class="workout__icon">🥇</span>
            <span class="workout__value">${workout.speed}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🏔️</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
              </li>`;
    form.insertAdjacentHTML('afterend', html);
  }

  //
  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      workout => workout.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      duration: 0.5,
      easeLinearity: 0.1,
    });
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    // console.log(data);
    if (!data) return;
    this.#workouts = data;
    this.#workouts.forEach(workout => this._renderWorkout(workout));
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
