import Phaser from '../lib/phaser.js';
import { SCENE_KEYS } from './scene-keys.js';
import { PLAYER_ASSET_KEYS, WORLD_ASSET_KEYS } from '../assets/asset-keys.js';

export class ApplicationScene extends Phaser.Scene {
    #formData = {
        name: 'Chan WAI MAN',
        studentId: '23xxxxxxD',
        reason: 'Lost ID Card / Card Damaged',
        photo: 'No file selected',
        paymentMethod: 'Cash'
    };

    constructor() {
        super({ key: SCENE_KEYS. APPLICATION_SCENE });
    }

    create() {
        // Create background in white
        this.cameras.main.setBackgroundColor(0xFFFFFF);

        // add the header panel
        const panel = this.add.container(512, 50);
        const panelBg = this.add.rectangle(0, 0, 1024, 100, 0x1f2937)
        .setOrigin(0.5);
        panel.add(panelBg);

        const headerTitle = this.add.text(0, 0, 'Student ID Card Renewal Application', {
        fontSize: '32px',
        color: '#ffffff',
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: 1024 - 80 },
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
        'Lost ID Card / Card Damaged',
        'Name Change',
        'Information Update',
        'Other',
        ]);
        this.#createDropdownField(350, 280, 'Payment Method:', 'paymentMethod', [
        'Cash',
        'Credit Card',
        'Bank Transfer',
        ]);
        
        // simulate upload photo
        this.#uploadPhotos(350, 330, 'Photo Upload:', 'photo');

        // Add background music
        this.backgroundMusic = this.sound.add(WORLD_ASSET_KEYS.WORLD_MUSIC, {
            loop: true, volume: 0.4, mute: false });
        
        // Slow it down to half speed
        this.backgroundMusic.setRate(0.7);
        
        // Start playing 
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

    #createTextField(x, y, label, fieldKey) {
        // Label
        this.add.text(x - 200, y, label, {
            fontSize: '18px',
            color: '#374151',
        }).setOrigin(0, 0.5);

        // Background rectangle (input box)
        const inputBox = this.add.rectangle(x - 200, y + 30, 250, 30, 0xffffff)
            .setStrokeStyle(2, 0x9ca3af)
            .setOrigin(0, 0.5)
            .setInteractive({ useHandCursor: true });

        // Set example text based on field
        const exampleText = this.#formData[fieldKey] || '';
        
        // Text inside the box
        const inputText = this.add.text(x - 190, y + 30, exampleText, {
            fontSize: '16px',
            color: '#6b7280', // Gray color for example text
        }).setOrigin(0, 0.5);

        // Track if this is the first click
        let isFirstClick = true;

        // Click on the box to focus it
        inputBox.on('pointerdown', () => {
            // Clear example text on first click
            if (isFirstClick) {
                this.#formData[fieldKey] = '';
                inputText.setText('');
                inputText.setColor('#000000'); // Change to normal text color
                isFirstClick = false;
            }
            
            this.currentInput = { inputText, fieldKey }; // Store reference to active field

            // Visual feedback: change border color when focused
            inputBox.setStrokeStyle(2, 0x3b82f6); // blue

            if (this.keyboardListener) return;
            this.keyboardListener = this.input.keyboard.on('keydown', (event) => {
                const key = event.key;

                if (key === 'Enter') {
                    this.currentInput = null;
                    inputBox.setStrokeStyle(2, 0x9ca3af);
                    this.input.keyboard.off('keydown', this.keyboardListener);
                    this.keyboardListener = null;
                    return;
                }

                if (key === 'Backspace') {
                    this.#formData[fieldKey] = this.#formData[fieldKey].slice(0, -1);
                } 
                
                else if (key.length === 1) {
                    this.#formData[fieldKey] += key;
                }

                inputText.setText(this.#formData[fieldKey]);
            });
        });

        // Optional: click outside to unfocus
        this.input.on('pointerdown', (pointer) => {
            if (this.currentInput && !inputBox.getBounds().contains(pointer.x, pointer.y)) {
                this.currentInput = null;
                inputBox.setStrokeStyle(2, 0x9ca3af);
                if (this.keyboardListener) {
                    this.input.keyboard.off('keydown', this.keyboardListener);
                    this.keyboardListener = null;
                }
            }
        });
    }

    #uploadPhotos(x, y, label, fieldKey) {
        this.add.text(x - 200, y, label, {
        fontSize: '18px',
        color: '#374151',
        }).setOrigin(0, 0.5);

        const uploadBox = this.add.rectangle(x + 100, y, 400, 30, 0xffffff)
        .setStrokeStyle(2, 0x9ca3af)
        .setOrigin(0, 0.5)
        .setInteractive({ useHandCursor: true });

        const uploadText = this.add.text(x + 110, y, 'No file selected', {
        fontSize: '16px',
        color: '#000000',
        }).setOrigin(0, 0.5);

        // display an example photo thumbnail (initially hidden)
        const photoThumbnail = this.add.rectangle(x + 150, y + 100, 250, 130, 0xe5e7eb)
        .setStrokeStyle(2, 0x9ca3af)
        .setOrigin(0.5)
        .setVisible(false);

        const previewText = this.add.text(x + 150, y + 100, 'Preview', {
        fontSize: '14px',
        color: '#6b7280',
        align: 'center',
        }).setOrigin(0.5)
        .setVisible(false);

        // use chi_resized.png as photoThumbnail
        const photoImage = this.add.image(x + 150, y + 100, `${PLAYER_ASSET_KEYS.PLAYER1}`)
        .setDisplaySize(130, 130)
        .setOrigin(0.5)
        .setDepth(0.5)
        .setVisible(false);

        // click box to upload photo
        uploadBox.on('pointerdown', () => {
        const fakeFileName = 'student_photo.jpg';
        this.#formData[fieldKey] = fakeFileName;
        uploadText.setText(fakeFileName);
        
        // show the photo thumbnail
        photoThumbnail.setVisible(true);
        previewText.setVisible(true);
        photoImage.setVisible(true);
        });
        }

    #createDropdownField(x, y, label, fieldKey, options) {
        // Label
        this.add.text(x - 200, y, label, {
            fontSize: '18px',
            color: '#374151',
        }).setOrigin(0, 0.5);

        // Main dropdown box
        const dropdownBox = this.add.rectangle(x + 100, y, 350, 30, 0xffffff)
            .setStrokeStyle(2, 0x9ca3af)
            .setOrigin(0, 0.5)
            .setInteractive({ useHandCursor: true });

        // Selected text
        const selectedText = this.add.text(x + 110, y, 'Select an option', {
            fontSize: '16px',
            color: '#6b7280',
        }).setOrigin(0, 0.5);

        // Arrow
        const arrow = this.add.triangle(x + 430, y, 0, 0, 10, 0, 5, 10, 0x374151)
            .setOrigin(0, 0.5);

        // Dropdown list container
        const optionsContainer = this.add.container(x + 100, y + 35)
            .setDepth(9999)  // Always on top
            .setVisible(false);

        // Background
        optionsContainer.add(
            this.add.rectangle(0, 0, 350, options.length * 35, 0xffffff)
                .setStrokeStyle(2, 0x9ca3af)
                .setOrigin(0, 0)
        );

        // Create options
        options.forEach((option, index) => {
            const yPos = index * 35;

            // Hover background
            const hoverBg = this.add.rectangle(0, yPos, 350, 35, 0xffffff)
                .setOrigin(0, 0);

            // Text
            const optionText = this.add.text(10, yPos + 17.5, option, {
                fontSize: '16px',
                color: '#000000',
            }).setOrigin(0, 0.5);

            // Full clickable area using a single invisible rectangle
            const clickArea = this.add.rectangle(0, yPos, 350, 35, 0x000000)
                .setAlpha(0.001)  // almost invisible but interactive
                .setOrigin(0, 0)
                .setInteractive({ useHandCursor: true })
                .on('pointerover', () => hoverBg.setFillStyle(0xf3f4f6))
                .on('pointerout', () => hoverBg.setFillStyle(0xffffff))
                .on('pointerdown', () => {
                    selectedText.setText(option);
                    selectedText.setColor('#000000');
                    this.#formData[fieldKey] = option;
                    optionsContainer.setVisible(false);
                    arrow.setRotation(0);
                });

            optionsContainer.add([hoverBg, optionText, clickArea]);
        });

        // Toggle dropdown
        dropdownBox.on('pointerdown', (pointer) => {
            pointer.event.stopPropagation();  // Prevent interference
            const isOpen = optionsContainer.visible;
            optionsContainer.setVisible(!isOpen);
            arrow.setRotation(isOpen ? 0 : Math.PI);  // Flip arrow down when open
        });

        // Close when clicking anywhere outside
        const closeListener = (pointer) => {
            if (optionsContainer.visible) {
                const inDropdown = dropdownBox.getBounds().contains(pointer.x, pointer.y);
                const inOptions = optionsContainer.getBounds().contains(pointer.x, pointer.y);
                if (!inDropdown && !inOptions) {
                    optionsContainer.setVisible(false);
                    arrow.setRotation(0);
                }
            }
        };

        // Use a single persistent listener instead of .once()
        this.input.on('pointerdown', closeListener);

        // Optional: pre-fill if value exists
        if (this.#formData[fieldKey]) {
            selectedText.setText(this.#formData[fieldKey]);
            selectedText.setColor('#000000');
        }
    }

    #handleSubmit() {
        console.log('Form Submitted:', this.#formData);
        // generate a simple report based on the form data
        const report = `Application Report:\n\n` +
        `Full Name: ${this.#formData.name}\n\n` +
        `Student ID: ${this.#formData.studentId}\n\n` +
        `Reason for Renewal: ${this.#formData.reason}\n\n` +
        `Payment Method: ${this.#formData.paymentMethod}\n\n` +
        `Photo Uploaded: ${this.#formData.photo}\n\n` +
        `Thank you for your application. Please wait for processing.`;
        
        // show the report with same interface as create items in computer scene
        const reportPanel = this.add.container(0, 0).setDepth(1000);
        const panelBg = this.add.rectangle(512, 330, 700, 450, 0xffffff)
        .setStrokeStyle(2, 0x9ca3af)
        .setOrigin(0.5);
        reportPanel.add(panelBg);

        // put the report content in the container 
        const reportText = this.add.text(512, 150, report, {
        fontSize: '18px',
        color: '#000000',
        align: 'left',
        wordWrap: { width: 700 - 40 },
        }).setOrigin(0.5, 0);

        reportPanel.add(reportText);

        const closeButton = this.add.rectangle(512, 500, 160, 60, 0x3b82f6)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
            // get the current position of world scene and return to it
            reportPanel.destroy();
            this.scene.start(SCENE_KEYS.WORLD_SCENE);
        });

        const closeText = this.add.text(512, 500, 'Close', {
        fontSize: '20px',
        color: '#ffffff',
        fontStyle: 'bold',
        }).setOrigin(0.5);

        reportPanel.add([closeButton, closeText]);
    } 

}