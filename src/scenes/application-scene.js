import Phaser from '../lib/phaser.js';
import { SCENE_KEYS } from './scene-keys.js';
import { PLAYER_ASSET_KEYS, WORLD_ASSET_KEYS } from '../assets/asset-keys.js';
import { Control } from '../utils/control.js';

export class ApplicationScene extends Phaser.Scene {
    #control;
    #formData = {
        name: 'Chan WAI MAN',
        studentId: '23xxxxxxD',
        reason: 'Lost ID Card / Card Damaged',
        photo: 'No file selected',
        paymentMethod: 'Cash'
    };

    constructor() {
        super({ key: SCENE_KEYS. APPLICATION_SCENE });
        this._currentInput = null;
        this.keyboardListener = null;
    }

    create() {
        this.cameras.main.setBackgroundColor(0xFFFFFF);
        this.#control = new Control(this);

        if (!this.keyboardListener) {
            this.keyboardListener = this.input.keyboard.on('keydown', (event) => {
                if (!this._currentInput) return;
                const { inputField, inputText, InputKey } = this._currentInput;
                const key = event.key;

                if (this.#control.getEnterKeyPressed()) {
                    inputField.setStrokeStyle(2, 0x9ca3af);
                    this._currentInput = null;
                    return;
                }

                if (this.#control.getBackspaceKeyPressed()) {
                    this.#formData[InputKey] = this.#formData[InputKey].slice(0, -1);
                } 
                else if (key.length === 1) {
                    this.#formData[InputKey] += key;
                }

                inputText.setText(this.#formData[InputKey]);
            });
        }

        // add the header panel
        const panel = this.add.container(512, 50);
        const panelBg = this.add.rectangle(0, 0, 1024, 100, 0x1f2937)
        .setOrigin(0.5);
        panel.add(panelBg);

        const headerTitle = this.add.text(0, 0, 'Student ID Card Renewal Application', {
        fontSize: '32px', color: '#ffffff', fontStyle: 'bold', align: 'center', wordWrap: { width: 1024 - 80 },
        }).setOrigin(0.5);
        panel.add(headerTitle);

        this.add.text(512, 80, '(Please fill all required fields.)', {
        fontSize: '20px',
            color: '#6b7280',
        }).setOrigin(0.5);

        // allow player to input the form in phaser
        this.#createTextField(350, 150, 'Full Name:', 'name');
        this.#createTextField(650, 150, 'Student ID:', 'studentId');

        // create dropdown fields
        this.#createDropdownField(350, 230, 'Reason for Renewal:', 'reason', [
        'Lost ID Card / Card Damaged', 'Information Update', 'Other',
        ]);

        this.#createDropdownField(350, 280, 'Payment Method:', 'paymentMethod', [
        'Cash','Credit Card', 'Bank Transfer']);
        
        // simulate upload photo
        this.#uploadPhotos(350, 330, 'Photo Upload:', 'photo');

        // Add background music
        this.backgroundMusic = this.sound.add(WORLD_ASSET_KEYS.WORLD_MUSIC, {
            loop: true, volume: 0.4, mute: false });
        this.backgroundMusic.setRate(0.7);
        this.sound.once(Phaser.Sound.Events.UNLOCKED, () => {
            if (!this.backgroundMusic.isPlaying) {
                this.backgroundMusic.play();
            }
        }); 
        
        // create submit button
        const submitButton = this.add.rectangle(512, 540, 300, 50, 0x3b82f6)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.#handleSubmit());

        const submitText = this.add.text(512, 540, 'Submit Application', {
        fontSize: '20px',
        color: '#ffffff',
        fontStyle: 'bold',
        }).setOrigin(0.5);
    }

    #createTextField(x, y, label, InputKey) {
        this.add.text(x - 200, y, label, {
            fontSize: '18px', color: '#374151' }).setOrigin(0, 0.5);

        const inputField = this.add.rectangle(x - 200, y + 30, 250, 30, 0xffffff)
            .setStrokeStyle(2, 0x9ca3af)
            .setOrigin(0, 0.5)
            .setInteractive({ useHandCursor: true });

        const exampleText = this.#formData[InputKey] || '';
        const inputText = this.add.text(x - 190, y + 30, exampleText, {
            fontSize: '16px', color: '#6b7280'}).setOrigin(0, 0.5);

        // activate one input at a time
        let isClick = true;
        inputField.on('pointerdown', () => {
            if (this._currentInput && this._currentInput.inputField !== inputField) {
                this._currentInput.inputField.setStrokeStyle(2, 0x9ca3af);
            }

            if (isClick) {
                this.#formData[InputKey] = '';
                inputText.setText('');
                inputText.setColor('#000000');
                isClick = false;
            }

            this._currentInput = { inputField, inputText, InputKey };
            inputField.setStrokeStyle(2, 0x3b82f6);
        });
    }

    #createDropdownField(x, y, label, InputKey, options) {
        this.add.text(x - 200, y, label, {
            fontSize: '18px',
            color: '#374151',
        }).setOrigin(0, 0.5);

        const dropdownField = this.add.rectangle(x + 100, y, 350, 30, 0xffffff)
            .setStrokeStyle(2, 0x9ca3af)
            .setOrigin(0, 0.5)
            .setInteractive({ useHandCursor: true });

        const selected = this.add.text(x + 110, y, 'Select an option', {
            fontSize: '16px',
            color: '#6b7280',
        }).setOrigin(0, 0.5);
 
        const arrow = this.add.triangle(x + 430, y, 0, 0, 10, 0, 5, 10, 0x374151)
            .setOrigin(0, 0.5);

        const optionsField = this.add.container(x + 100, y + 35)
            .setDepth(9999) 
            .setVisible(false);

        optionsField.add(
            this.add.rectangle(0, 0, 350, options.length * 35, 0xffffff)
                .setStrokeStyle(2, 0x9ca3af) .setOrigin(0, 0)
        );

        // Create options
        options.forEach((option, index) => {
            const optionBg = this.add.rectangle(0, index * 35, 350, 35, 0xffffff)
                .setOrigin(0, 0);

            const optionText = this.add.text(10, index * 35 + 17.5, option, {
                fontSize: '16px',
                color: '#000000',
            }).setOrigin(0, 0.5);

            const optionArea = this.add.rectangle(0, index * 35, 350, 35, 0x000000)
                .setAlpha(0.001) .setOrigin(0, 0)
                .setInteractive({ useHandCursor: true })
                .on('pointerover', () => optionBg.setFillStyle(0xf3f4f6))
                .on('pointerout', () => optionBg.setFillStyle(0xffffff))
                .on('pointerdown', () => {
                    selected.setText(option);
                    selected.setColor('#000000');
                    this.#formData[InputKey] = option;
                    optionsField.setVisible(false);
                    arrow.setRotation(0);
                });

            optionsField.add([optionBg, optionText, optionArea]);
        });


        dropdownField.on('pointerdown', (pointer) => {
            pointer.event.stopPropagation();  
            optionsField.setVisible(!optionsField.visible);
            arrow.setRotation(optionsField.visible ? Math.PI : 0);
        });

        // Close when clicking anywhere outside
        const closeListener = (pointer) => {
            if (optionsField.visible) {
                if (!dropdownField.getBounds().contains(pointer.x, pointer.y) && !optionsField.getBounds().contains(pointer.x, pointer.y)) {
                    optionsField.setVisible(false);
                    arrow.setRotation(0);
                }
            }
        };
        this.input.on('pointerdown', closeListener);

        if (this.#formData[InputKey]) {
            selected.setText(this.#formData[InputKey]);
            selected.setColor('#000000');
        }
    }

    #uploadPhotos(x, y, label, InputKey) {
        this.add.text(x - 200, y, label, {
        fontSize: '18px',
        color: '#374151',
        }).setOrigin(0, 0.5);

        const uploadField = this.add.rectangle(x + 100, y, 400, 30, 0xffffff)
        .setStrokeStyle(2, 0x9ca3af).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });

        const uploadText = this.add.text(x + 110, y, 'No file selected', {
        fontSize: '16px',
        color: '#000000',
        }).setOrigin(0, 0.5);

        // preview photo thumbnail
        const photoThumbnail = this.add.rectangle(x + 150, y + 100, 250, 130, 0xe5e7eb)
        .setStrokeStyle(2, 0x9ca3af).setOrigin(0.5).setVisible(false);

        const photoImage = this.add.image(x + 150, y + 100, `${PLAYER_ASSET_KEYS.PLAYER1}`)
        .setDisplaySize(130, 130) .setOrigin(0.5).setDepth(0.5).setVisible(false);

        uploadField.on('pointerdown', () => {
            const fileName = 'student_photo.jpg';
            this.#formData[InputKey] = fileName;
            uploadText.setText(fileName);
            
            // show the photo thumbnail
            photoThumbnail.setVisible(true);
            photoImage.setVisible(true);
        });
    }    

    #handleSubmit() {
        console.log('Form Submitted:', this.#formData);

        // generate a simple report based on the form data
        const reportFormat = `Application Report:\n\n` +
        `Full Name: ${this.#formData.name}\n\n` +
        `Student ID: ${this.#formData.studentId}\n\n` +
        `Reason for Renewal: ${this.#formData.reason}\n\n` +
        `Payment Method: ${this.#formData.paymentMethod}\n\n` +
        `Photo Uploaded: ${this.#formData.photo}\n\n` +
        `Thank you for your application. Please wait for processing.`;
        
        // report panel
        const reportPanel = this.add.container(0, 0).setDepth(1000);
        const reportBg = this.add.rectangle(512, 330, 700, 450, 0xffffff)
        .setStrokeStyle(2, 0x9ca3af)
        .setOrigin(0.5);
        reportPanel.add(reportBg);

        const reportText = this.add.text(512, 150, reportFormat, {
        fontSize: '18px',
        color: '#000000',
        align: 'left',
        wordWrap: { width: 700 - 40 },
        }).setOrigin(0.5, 0);

        reportPanel.add(reportText);

        // create close button
        const closeButton = this.add.rectangle(512, 500, 160, 60, 0x3b82f6)
        .setOrigin(0.5).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
            reportPanel.destroy();
            this.scene.start(SCENE_KEYS.WORLD_SCENE); // return to world scene
        });

        const closeText = this.add.text(512, 500, 'Close', {
        fontSize: '20px',
        color: '#ffffff',
        fontStyle: 'bold',
        }).setOrigin(0.5);

        reportPanel.add([closeButton, closeText]);
    } 

}